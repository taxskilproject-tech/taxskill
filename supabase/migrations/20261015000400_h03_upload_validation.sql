create function public.h03_upload_context(p_intent_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare intent public.upload_intents; obligation public.obligations;
begin
  select * into intent from public.upload_intents where id=p_intent_id and user_id=auth.uid();
  if intent.id is null then perform private.fail('NOT_FOUND'); end if;
  perform private.admit_session(intent.organization_id);
  obligation := private.document_access(intent.organization_id,(select obligation_id from public.deliverables where id=intent.deliverable_id),auth.uid(),'upload');
  return jsonb_build_object('intent',to_jsonb(intent),'specs',(select value from jsonb_array_elements(obligation.snapshot->'deliverables') where value->>'position_code'=(select position_code from public.deliverables where id=intent.deliverable_id)));
end $$;
create function private.validation_actor(intent public.upload_intents,actor uuid,session uuid) returns public.obligations
language plpgsql security definer set search_path='' as $$
declare obligation public.obligations;
begin
  if auth.role()<>'service_role' then perform private.fail('FORBIDDEN'); end if;
  if intent.id is null or intent.user_id<>actor then perform private.fail('NOT_FOUND'); end if;
  if not exists(select 1 from public.app_sessions where organization_id=intent.organization_id and user_id=actor and session_id=session and revoked_at is null) then perform private.fail('UNAUTHENTICATED'); end if;
  obligation := private.document_access(intent.organization_id,(select obligation_id from public.deliverables where id=intent.deliverable_id),actor,'upload');
  return obligation;
end $$;
create function public.h03_claim_upload(p_intent_id uuid,p_actor_id uuid,p_session_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare intent public.upload_intents; obligation public.obligations; slot public.deliverables; specs jsonb;
begin
  if auth.role()<>'service_role' then perform private.fail('FORBIDDEN'); end if;
  perform 1 from public.organizations where id=(select organization_id from public.upload_intents where id=p_intent_id) for update;
  select * into intent from public.upload_intents where id=p_intent_id for update;
  obligation := private.validation_actor(intent,p_actor_id,p_session_id);
  if intent.state='ready' then return jsonb_build_object('status','ready','version_id',intent.confirmed_version_id); end if;
  if intent.state='validating' and intent.validation_lease_until>now() then return jsonb_build_object('status','processing'); end if;
  if intent.state in ('rejected','conflict','expired') then perform private.fail('VALIDATION_ERROR'); end if;
  if intent.expires_at<=now() then perform private.fail('VALIDATION_ERROR'); end if;
  select * into slot from public.deliverables where id=intent.deliverable_id for update;
  if obligation.disposition<>'active' or slot.review_state='aprobado' then perform private.fail('FORBIDDEN'); end if;
  if slot.revision<>intent.expected_deliverable_revision or not exists(select 1 from public.submission_cycles where id=intent.cycle_id and state in ('open','submitted')) then perform private.fail('CONFLICT'); end if;
  select value into specs from jsonb_array_elements(obligation.snapshot->'deliverables') where value->>'position_code'=slot.position_code;
  update public.upload_intents set state='validating',validation_token=gen_random_uuid(),validation_lease_until=now()+interval '2 minutes',
    validation_result=jsonb_build_object('schema_version',1,'status','processing','actual_bytes',null,'actual_mime',null,'extension',null,'sha256',null,'validated_at',null,'error_code',null,'validator_version','h03.1','checks',jsonb_build_object('size',null,'signature',null,'office_container',null)),
    error_code=null,revision=revision+1,updated_at=now(),updated_by=p_actor_id where id=intent.id returning * into intent;
  return jsonb_build_object('status','claimed','intent',to_jsonb(intent),'specs',specs);
end $$;
create function public.h03_confirm_upload(p_intent_id uuid,p_actor_id uuid,p_session_id uuid,p_token uuid,p_validation jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare intent public.upload_intents; obligation public.obligations; slot public.deliverables; cycle public.submission_cycles;
  specs jsonb; version_number integer; moment timestamptz := clock_timestamp();
begin
  if auth.role()<>'service_role' then perform private.fail('FORBIDDEN'); end if;
  perform 1 from public.organizations where id=(select organization_id from public.upload_intents where id=p_intent_id) for update;
  select * into intent from public.upload_intents where id=p_intent_id for update;
  obligation := private.validation_actor(intent,p_actor_id,p_session_id);
  if intent.state='ready' then return jsonb_build_object('status','ready','version_id',intent.confirmed_version_id); end if;
  if intent.state<>'validating' or intent.validation_token is distinct from p_token or intent.validation_lease_until<=now() then perform private.fail('CONFLICT'); end if;
  select * into slot from public.deliverables where id=intent.deliverable_id for update;
  select * into cycle from public.submission_cycles where id=intent.cycle_id for update;
  if slot.revision<>intent.expected_deliverable_revision or slot.review_state='aprobado' or cycle.state not in ('open','submitted') or obligation.disposition<>'active' then perform private.fail('CONFLICT'); end if;
  select value into specs from jsonb_array_elements(obligation.snapshot->'deliverables') where value->>'position_code'=slot.position_code;
  if p_validation->>'status'<>'accepted' or coalesce((p_validation->>'actual_bytes')::bigint,0)<>intent.declared_bytes
    or (p_validation->>'actual_bytes')::bigint>(specs->>'max_file_bytes')::bigint
    or not specs->'allowed_formats' ? (p_validation->>'extension') or coalesce(p_validation->>'sha256','') !~ '^[0-9a-f]{64}$'
    or p_validation->'checks'->>'signature'<>'true' or p_validation->'checks'->>'size'<>'true'
    or (p_validation->>'extension' in ('xlsx','docx') and p_validation->'checks'->>'office_container'<>'true') then perform private.fail('VALIDATION_ERROR'); end if;
  select coalesce(max(v.version_number),0)+1 into version_number from public.document_versions v where deliverable_id=slot.id;
  insert into public.document_versions(id,organization_id,deliverable_id,cycle_id,upload_intent_id,version_number,storage_bucket,storage_path,original_name,validated_bytes,validated_mime,extension,sha256,uploaded_by,finalized_at,created_by)
    values(intent.reserved_version_id,intent.organization_id,slot.id,cycle.id,intent.id,version_number,intent.final_bucket,intent.final_path,intent.original_name,(p_validation->>'actual_bytes')::bigint,p_validation->>'actual_mime',p_validation->>'extension',p_validation->>'sha256',p_actor_id,moment,p_actor_id);
  update public.deliverables set current_version_id=intent.reserved_version_id,review_state='por_revisar',revision=revision+1,updated_at=moment,updated_by=p_actor_id where id=slot.id;
  update public.submission_cycles set first_submitted_at=coalesce(first_submitted_at,moment),state='submitted',revision=revision+1,updated_at=moment,updated_by=p_actor_id where id=cycle.id;
  update public.obligations set revision=revision+1,updated_at=moment,updated_by=p_actor_id where id=obligation.id;
  update public.upload_intents set state='ready',validation_result=p_validation||jsonb_build_object('validated_at',moment),confirmed_version_id=intent.reserved_version_id,
    validation_token=null,validation_lease_until=null,revision=revision+1,updated_at=moment,updated_by=p_actor_id where id=intent.id;
  perform private.audit(intent.organization_id,p_actor_id,intent.request_id,'FinalizeUpload','document_versions',intent.reserved_version_id,null,jsonb_build_object('current_version_id',intent.reserved_version_id));
  perform private.document_event(obligation,p_actor_id,'upload_finalized','upload:'||intent.reserved_version_id,null,cycle.id);
  return jsonb_build_object('status','ready','version_id',intent.reserved_version_id);
end $$;
create function public.h03_release_upload(p_intent_id uuid,p_token uuid,p_error_code text,p_rejected boolean default false) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.role()<>'service_role' then perform private.fail('FORBIDDEN'); end if;
  if p_error_code not in ('FILE_INVALID','FILE_TOO_LARGE','FILE_MISSING','CONFLICT','DEPENDENCY_UNAVAILABLE') then perform private.fail('VALIDATION_ERROR'); end if;
  update public.upload_intents set state=case when p_error_code='CONFLICT' then 'conflict' when p_rejected then 'rejected' else 'uploaded' end,
    error_code=p_error_code,validation_token=null,validation_lease_until=null,revision=revision+1,updated_at=now(),
    validation_result=jsonb_build_object('schema_version',1,'status',case when p_rejected then 'rejected' else 'processing' end,'error_code',p_error_code,'validator_version','h03.1',
      'actual_bytes',null,'actual_mime',null,'extension',null,'sha256',null,'validated_at',null,'checks',jsonb_build_object('size',null,'signature',null,'office_container',null))
    where id=p_intent_id and state='validating' and validation_token=p_token;
end $$;
create function public.h03_expire_uploads() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.role()<>'service_role' then perform private.fail('FORBIDDEN'); end if;
  -- Never claim validating or confirmed intents, nor delete final objects.
  with candidates as (select id from public.upload_intents where expires_at<=now() and confirmed_version_id is null and state in ('reserved','uploaded','rejected','conflict','expired') order by expires_at limit 100 for update skip locked),
    changed as (update public.upload_intents i set state='expired',error_code='EXPIRED',revision=revision+1,updated_at=now() from candidates c where i.id=c.id returning i.id,i.staging_bucket,i.staging_path)
    select coalesce(jsonb_agg(to_jsonb(c)),'[]') into result from changed c;
  return result;
end $$;
-- A successful cleanup records the removal, avoiding repeated batches of the oldest 100.
alter table public.upload_intents add staging_cleaned_at timestamptz;
create function public.h03_mark_staging_cleaned(p_intent_ids uuid[]) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.role()<>'service_role' then perform private.fail('FORBIDDEN'); end if;
  update public.upload_intents set staging_cleaned_at=now(),revision=revision+1,updated_at=now() where id=any(p_intent_ids) and state='expired' and confirmed_version_id is null;
end $$;
-- Replace expiration query to exclude already cleaned rows.
create or replace function public.h03_expire_uploads() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.role()<>'service_role' then perform private.fail('FORBIDDEN'); end if;
  with candidates as (select id from public.upload_intents where expires_at<=now() and confirmed_version_id is null and staging_cleaned_at is null and state in ('reserved','uploaded','rejected','conflict','expired') order by expires_at limit 100 for update skip locked),
    changed as (update public.upload_intents i set state='expired',error_code='EXPIRED',revision=revision+1,updated_at=now() from candidates c where i.id=c.id returning i.id,i.staging_bucket,i.staging_path)
    select coalesce(jsonb_agg(to_jsonb(c)),'[]') into result from changed c;
  return result;
end $$;
revoke all on function public.h03_upload_context(uuid) from public,anon;
grant execute on function public.h03_upload_context(uuid) to authenticated;
revoke all on function public.h03_claim_upload(uuid,uuid,uuid),public.h03_confirm_upload(uuid,uuid,uuid,uuid,jsonb),public.h03_release_upload(uuid,uuid,text,boolean),public.h03_expire_uploads(),public.h03_mark_staging_cleaned(uuid[]) from public,anon,authenticated;
grant execute on function public.h03_claim_upload(uuid,uuid,uuid),public.h03_confirm_upload(uuid,uuid,uuid,uuid,jsonb),public.h03_release_upload(uuid,uuid,text,boolean),public.h03_expire_uploads(),public.h03_mark_staging_cleaned(uuid[]) to service_role;
revoke all on function private.validation_actor(public.upload_intents,uuid,uuid) from public,anon,authenticated;
