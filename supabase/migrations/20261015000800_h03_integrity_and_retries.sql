-- Recheck download capability on idempotent replay; preserve reliable event dates.
alter table public.requirement_rules add foreign key(organization_id,delivery_responsible_id) references public.organization_members(organization_id,user_id) on delete restrict;
alter table public.obligations add foreign key(organization_id,delivery_responsible_id) references public.organization_members(organization_id,user_id) on delete restrict;
alter table public.employment_periods add check(end_date is null or termination_reason is not null), add check(currency ~ '^[A-Z]{3}$');
alter table public.upload_intents add constraint ready_validation_complete check(coalesce(state<>'ready' or
  (validation_result->>'status'='accepted' and (validation_result->>'actual_bytes')::bigint=declared_bytes
    and validation_result->>'sha256' ~ '^[0-9a-f]{64}$' and validation_result->'checks'->>'size'='true'
    and validation_result->'checks'->>'signature'='true' and validation_result->>'actual_mime' is not null
    and validation_result->>'extension' is not null and validation_result->>'validated_at' is not null),false));
create function private.preserve_obligation_origin() returns trigger language plpgsql set search_path='' as $$
begin
  if row(new.organization_id,new.class,new.company_id,new.employment_period_id,new.module,new.period_id,new.rule_id,new.rule_version_id,new.document_type_id,new.destination_key,new.occurrence_key,new.manual_request_id,new.title,new.description,new.initial_due_date,new.is_required,new.snapshot)
    is distinct from row(old.organization_id,old.class,old.company_id,old.employment_period_id,old.module,old.period_id,old.rule_id,old.rule_version_id,old.document_type_id,old.destination_key,old.occurrence_key,old.manual_request_id,old.title,old.description,old.initial_due_date,old.is_required,old.snapshot) then perform private.fail('FORBIDDEN'); end if;
  return new;
end $$;
create trigger obligation_origin before update on public.obligations for each row execute function private.preserve_obligation_origin();
revoke all on function private.preserve_obligation_origin() from public,anon,authenticated;
create or replace function public.h03_command(p_organization_id uuid,p_request_id uuid,p_operation text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
<<body>>
declare entry public.operation_requests; result jsonb; fingerprint text; error_code text;
begin
  perform 1 from public.organizations where id=p_organization_id for update;
  perform private.assert_member(p_organization_id,auth.uid()); perform private.admit_session(p_organization_id);
  if p_request_id is null or p_input is null or jsonb_typeof(p_input)<>'object' then perform private.fail('VALIDATION_ERROR'); end if;
  if length(p_input::text)>32768 then perform private.fail('VALIDATION_ERROR'); end if;
  if p_operation='RequestDownload' then
    perform private.document_access(p_organization_id,(select d.obligation_id from public.document_versions v join public.deliverables d on d.id=v.deliverable_id where v.organization_id=p_organization_id and v.id=(p_input->>'version_id')::uuid),auth.uid(),'download');
  end if;
  fingerprint := encode(extensions.digest(convert_to(p_input::text,'utf8'),'sha256'),'hex');
  insert into public.operation_requests(organization_id,request_id,actor_user_id,actor_key,operation,input_hash,created_by)
    values(p_organization_id,p_request_id,auth.uid(),'user:'||auth.uid(),p_operation,fingerprint,auth.uid()) on conflict do nothing;
  select * into entry from public.operation_requests where organization_id=p_organization_id and actor_key='user:'||auth.uid() and operation=p_operation and request_id=p_request_id for update;
  if entry.input_hash<>fingerprint then perform private.fail('CONFLICT'); end if;
  if entry.status='completed' then return jsonb_build_object('ok',true,'data',entry.result); end if;
  begin
    result := private.document_command(p_organization_id,auth.uid(),p_request_id,p_operation,p_input);
  exception when others then
    error_code := case when sqlstate in ('23505','40001','40P01') then 'CONFLICT' when sqlstate in ('23502','23503','23514','22P02','22007','22008','22023') then 'VALIDATION_ERROR'
      when sqlstate='P0001' and sqlerrm in ('FORBIDDEN','UNAUTHENTICATED','NOT_FOUND','CONFLICT','VALIDATION_ERROR','FILE_TOO_LARGE','FILE_INVALID','FILE_MISSING') then sqlerrm else 'DEPENDENCY_UNAVAILABLE' end;
    update public.operation_requests set status='failed',error_code=body.error_code,revision=revision+1,updated_at=now() where id=entry.id;
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code',error_code));
  end;
  update public.operation_requests set status='completed',result=body.result,completed_at=now(),error_code=null,updated_at=now(),revision=revision+1 where id=entry.id;
  return jsonb_build_object('ok',true,'data',result);
exception when raise_exception then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',sqlerrm));
end $$;
create or replace function private.reserve_upload(org uuid, actor uuid, req uuid, input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare slot public.deliverables; obligation public.obligations; cycle public.submission_cycles; specs jsonb;
  intent_id uuid := gen_random_uuid(); version_id uuid := gen_random_uuid(); extension text; base_path text;
begin
  select * into slot from public.deliverables where organization_id=org and id=(input->>'deliverable_id')::uuid for update;
  obligation := private.document_access(org,slot.obligation_id,actor,'upload');
  if obligation.disposition<>'active' or slot.review_state='aprobado' then perform private.fail('FORBIDDEN'); end if;
  if (input->>'expected_revision')::integer is distinct from slot.revision then perform private.fail('CONFLICT'); end if;
  select * into cycle from public.submission_cycles where organization_id=org and deliverable_id=slot.id and state in ('open','submitted') for update;
  if cycle.id is null or cycle.id is distinct from (input->>'cycle_id')::uuid then perform private.fail('CONFLICT'); end if;
  select value into specs from jsonb_array_elements(obligation.snapshot->'deliverables') where value->>'position_code'=slot.position_code;
  extension := lower(substring(input->>'original_name' from '\.([^.]+)$'));
  if extension is null or not specs->'allowed_formats' ? extension or coalesce((input->>'declared_bytes')::bigint,0)<=0 then perform private.fail('VALIDATION_ERROR'); end if;
  if (input->>'declared_bytes')::bigint>(specs->>'max_file_bytes')::bigint then perform private.fail('FILE_TOO_LARGE'); end if;
  base_path := org||'/'||obligation.id||'/'||slot.id||'/'||version_id||'.'||extension;
  insert into public.upload_intents(id,organization_id,deliverable_id,cycle_id,user_id,request_id,reserved_version_id,expected_deliverable_revision,original_name,declared_bytes,declared_mime,staging_path,final_path,created_by,updated_by)
    values(intent_id,org,slot.id,cycle.id,actor,req,version_id,slot.revision,input->>'original_name',(input->>'declared_bytes')::bigint,coalesce(input->>'declared_mime','application/octet-stream'),base_path,base_path,actor,actor);
  return jsonb_build_object('schema_version',1,'resource_id',intent_id,'upload_intent_id',intent_id,'revision',0,'status','reserved');
end $$;

create or replace function private.document_event(obligation public.obligations, actor uuid, p_event_type text, p_event_key text, review_id uuid default null, cycle uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare event_id uuid; payload jsonb; recipient uuid;
begin
  payload := jsonb_build_object('schema_version',1,'title',obligation.title,'body',case p_event_type when 'upload_finalized' then 'Hay un archivo recibido para revisión.' when 'observed' then 'Un archivo requiere corrección. Consulta el detalle.' when 'reopened' then 'Un archivo requiere una nueva entrega.' when 'approved' then 'Un archivo fue aprobado.' else 'Tienes una obligación asignada.' end,
    'target_path','/actividades/'||obligation.id,'priority',obligation.priority,'due_date',coalesce((select new_due_date from public.review_events where id=review_id),obligation.initial_due_date),
    'scope_label',coalesce(obligation.snapshot->'destination'->>'company_legal_name','Interna del estudio'));
  insert into public.notification_events(organization_id,event_key,event_type,company_id,module,obligation_id,cycle_id,review_event_id,payload,created_by)
    values(obligation.organization_id,p_event_key,p_event_type,obligation.company_id,obligation.module,obligation.id,cycle,review_id,payload,actor)
    on conflict(organization_id,event_key) do nothing returning id into event_id;
  if event_id is null then return; end if;
  for recipient in select m.user_id from public.organization_members m where m.organization_id=obligation.organization_id and m.user_id<>actor
    and private.has_permission(m.organization_id,m.user_id,obligation.company_id,obligation.module,'view')
    and (m.user_id=obligation.delivery_responsible_id or (p_event_type='upload_finalized' and (private.has_permission(m.organization_id,m.user_id,obligation.company_id,obligation.module,'approve') or private.has_permission(m.organization_id,m.user_id,obligation.company_id,obligation.module,'observe')))) loop
    insert into public.notifications(organization_id,recipient_id,event_id,title,body,target_path,created_by)
      values(obligation.organization_id,recipient,event_id,payload->>'title',payload->>'body',payload->>'target_path',actor) on conflict do nothing;
  end loop;
end $$;
