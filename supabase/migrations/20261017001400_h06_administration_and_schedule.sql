alter function public.h06_query(uuid,text,jsonb) rename to h06_query_core;
alter function public.h06_query_core(uuid,text,jsonb) set schema private;
create function public.h06_query(p_organization_id uuid,p_resource text,p_input jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_result jsonb; v_page integer:=coalesce((p_input->>'page')::integer,1); v_size integer:=coalesce((p_input->>'pageSize')::integer,25);
begin
  if p_resource not in ('digests','attempts','contact_issues') then return private.h06_query_core(p_organization_id,p_resource,p_input); end if;
  perform private.assert_member(p_organization_id,auth.uid(),true); perform private.admit_session(p_organization_id);
  if v_size not in (25,50,100) or v_page not between 1 and 100000 then perform private.fail('VALIDATION_ERROR'); end if;
  if p_resource='digests' then
    with visible as(select d.id,d.delivery_id,d.recipient_id,p.full_name recipient_name,d.local_date,d.status,d.http_attempt_count,d.last_attempt_at,d.accepted_at,d.sent_at,d.delivered_at,d.expired_at,d.last_error_code,d.provider_message_id,d.revision,
        (d.gateway_state->'receipt' is not null and d.gateway_state->'receipt'<>'null'::jsonb) has_receipt,
        (d.gateway_state->>'claim_id' is not null and (d.gateway_state->'receipt' is null or d.gateway_state->'receipt'='null'::jsonb)) needs_provider_reconciliation
      from public.whatsapp_digests d join public.profiles p on p.user_id=d.recipient_id where d.organization_id=p_organization_id)
    select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from visible order by local_date desc,id offset (v_page-1)*v_size limit v_size) r),'[]'),'count',(select count(*) from visible)) into v_result;
  elsif p_resource='attempts' then
    with visible as(select id,direction,attempt_number,batch_id,receipt_id,http_status,duration_ms,provider_status,provider_message_id,occurred_at,error_code,result,created_at from public.integration_attempts where organization_id=p_organization_id and digest_id=(p_input->>'digest_id')::uuid)
    select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from visible order by created_at desc,id offset (v_page-1)*v_size limit v_size) r),'[]'),'count',(select count(*) from visible)) into v_result;
  else
    with visible as(select p.user_id,p.full_name,case when nullif(p.whatsapp_phone,'') is null then 'missing' else 'invalid' end reason
      from public.organization_members m join public.profiles p on p.user_id=m.user_id where m.organization_id=p_organization_id and m.active and m.deleted_at is null and p.enabled and p.deleted_at is null
        and not coalesce(p.whatsapp_phone ~ '^\+[1-9][0-9]{7,14}$',false)
        and exists(select 1 from public.obligations o where o.organization_id=p_organization_id and o.delivery_responsible_id=p.user_id and private.h06_operational(o)))
    select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from visible order by full_name,user_id offset (v_page-1)*v_size limit v_size) r),'[]'),'count',(select count(*) from visible)) into v_result;
  end if;
  return jsonb_build_object('ok',true,'data',v_result);
exception when raise_exception then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',sqlerrm));
  when invalid_text_representation then return jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR'));
end $$;
revoke all on function private.h06_query_core(uuid,text,jsonb),public.h06_query(uuid,text,jsonb) from public,anon;
revoke all on function private.h06_query_core(uuid,text,jsonb) from authenticated;
grant execute on function public.h06_query(uuid,text,jsonb) to authenticated;

alter function private.document_command(uuid,uuid,uuid,text,jsonb) rename to document_command_h06_base;
create function private.document_command(org uuid,actor uuid,req uuid,op text,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_profile public.profiles; v_digest public.whatsapp_digests; v_result jsonb; v_rule public.requirement_rules; v_deleted boolean;
begin
  if op='SaveWhatsAppContact' then
    perform private.assert_member(org,actor,true);
    select p.* into v_profile from public.profiles p join public.organization_members m on m.user_id=p.user_id and m.organization_id=org where p.user_id=(input->>'user_id')::uuid and p.deleted_at is null and m.deleted_at is null for update of p;
    if v_profile.user_id is null then perform private.fail('NOT_FOUND'); end if;
    if (input->>'expected_revision')::integer is distinct from v_profile.revision then perform private.fail('CONFLICT'); end if;
    if input->>'whatsapp_phone' is not null and input->>'whatsapp_phone' !~ '^\+[1-9][0-9]{7,14}$' then perform private.fail('VALIDATION_ERROR'); end if;
    update public.profiles set whatsapp_phone=input->>'whatsapp_phone',updated_at=now(),updated_by=actor,revision=revision+1 where user_id=v_profile.user_id;
    perform private.audit(org,actor,req,op,'profiles',v_profile.user_id,null,null);
    return jsonb_build_object('schema_version',1,'resource_id',v_profile.user_id,'revision',v_profile.revision+1,'status','completed');
  end if;
  if op='ReconcileDigest' then
    perform private.assert_member(org,actor,true);
    select * into v_digest from public.whatsapp_digests where organization_id=org and id=(input->>'digest_id')::uuid for update;
    if v_digest.id is null then perform private.fail('NOT_FOUND'); end if;
    if (input->>'expected_revision')::integer is distinct from v_digest.revision then perform private.fail('CONFLICT'); end if;
    if v_digest.gateway_state->'receipt' is null or v_digest.gateway_state->'receipt'='null'::jsonb then perform private.fail('DEPENDENCY_UNAVAILABLE'); end if;
    v_result:=private.h06_apply_receipt(v_digest.gateway_state->'receipt');
    perform private.audit(org,actor,req,op,'whatsapp_digests',v_digest.id,null,jsonb_build_object('status',v_result->>'status'));
    return jsonb_build_object('schema_version',1,'resource_id',v_digest.id,'revision',(select revision from public.whatsapp_digests where id=v_digest.id),'status','completed');
  end if;
  if op in ('DeleteDocumentEntity','RestoreDocumentEntity') and input->>'entity'='requirement_rules' then
    select * into v_rule from public.requirement_rules where organization_id=org and id=(input->>'id')::uuid and class='additional' for update;
    if v_rule.id is not null then
      perform private.assert_member(org,actor,true); v_deleted:=op='DeleteDocumentEntity';
      if (input->>'expected_revision')::integer is distinct from v_rule.revision then perform private.fail('CONFLICT'); end if;
      if nullif(btrim(input->>'reason'),'') is null or v_deleted is distinct from (v_rule.deleted_at is null) then perform private.fail('VALIDATION_ERROR'); end if;
      if not v_deleted and (v_rule.company_id is not null and not exists(select 1 from public.companies where id=v_rule.company_id and deleted_at is null and status='active')
        or not private.has_permission(org,v_rule.delivery_responsible_id,v_rule.company_id,'actividades','upload')) then perform private.fail('VALIDATION_ERROR'); end if;
      update public.requirement_rules set deleted_at=case when v_deleted then now() end,deleted_by=case when v_deleted then actor end,deletion_reason=case when v_deleted then btrim(input->>'reason') end,
        operation_pauses=private.pause_intervals(operation_pauses,v_deleted,'soft_delete',input->>'reason',actor),updated_at=now(),updated_by=actor,revision=revision+1 where id=v_rule.id;
      perform private.audit(org,actor,req,op,'requirement_rules',v_rule.id,to_jsonb(v_rule),(select to_jsonb(r) from public.requirement_rules r where id=v_rule.id));
      return jsonb_build_object('schema_version',1,'resource_id',v_rule.id,'revision',v_rule.revision+1,'status','completed');
    end if;
  end if;
  return private.document_command_h06_base(org,actor,req,op,input);
end $$;

create function public.h06_schedule(p_function_url text,p_secret text,p_enabled boolean default true) returns void
language plpgsql security definer set search_path='' as $$
declare v_secret uuid; v_job text;
begin
  perform private.h06_system();
  if not p_enabled then perform cron.unschedule(jobid) from cron.job where jobname='h06-notifications-dispatch'; return; end if;
  if not coalesce(p_function_url ~ '^https://[a-z0-9]{20}\.supabase\.co/functions/v1/notification-operations$'
    or p_function_url='http://kong:8000/functions/v1/notification-operations',false) or length(p_secret)<32 then perform private.fail('VALIDATION_ERROR'); end if;
  select id into v_secret from vault.secrets where name='h06_dispatch_secret';
  if v_secret is null then perform vault.create_secret(p_secret,'h06_dispatch_secret','Notification dispatcher only'); else perform vault.update_secret(v_secret,p_secret); end if;
  v_job:=format('select net.http_post(url := %L, headers := jsonb_build_object(''Content-Type'',''application/json'',''x-dispatch-key'',(select decrypted_secret from vault.decrypted_secrets where name=''h06_dispatch_secret'')),body := ''{}''::jsonb,timeout_milliseconds := 30000);',p_function_url);
  perform cron.schedule('h06-notifications-dispatch','* * * * *',v_job);
end $$;
revoke all on function public.h06_schedule(text,text,boolean) from public,anon,authenticated;
grant execute on function public.h06_schedule(text,text,boolean) to service_role;
revoke all on function private.document_command_h06_base(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
