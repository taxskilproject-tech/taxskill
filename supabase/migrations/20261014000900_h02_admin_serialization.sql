-- Serialize Auth changes for each target and advance its revision at reservation.
create or replace function public.h02_admin_prepare(p_organization_id uuid, p_actor_id uuid, p_request_id uuid, p_operation text, p_input_hash text, p_target_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare entry public.operation_requests; recent integer;
begin
  if auth.role()<>'service_role' then perform private.fail('FORBIDDEN'); end if;
  perform 1 from public.organizations where id=p_organization_id for update;
  perform private.assert_member(p_organization_id,p_actor_id,true);
  if p_operation not in ('CreateUser','SetUserPassword','SetUserEnabled') or p_input_hash !~ '^[0-9a-f]{64}$' then perform private.fail('VALIDATION_ERROR'); end if;
  if p_operation<>'CreateUser' and not exists(select 1 from public.organization_members where organization_id=p_organization_id and user_id=p_target_id) then perform private.fail('NOT_FOUND'); end if;
  if p_target_id is not null and exists(select 1 from public.operation_requests r where r.organization_id=p_organization_id and r.external_identity_id=p_target_id
    and not (r.actor_user_id=p_actor_id and r.operation=p_operation and r.request_id=p_request_id)
    and (r.status='processing' or (r.status='failed' and r.result->>'status'='db_staged'))) then perform private.fail('CONFLICT'); end if;
  insert into public.operation_requests(organization_id,request_id,actor_user_id,actor_key,operation,input_hash,external_identity_id,resource_table,resource_id,created_by)
    values(p_organization_id,p_request_id,p_actor_id,'user:'||p_actor_id,p_operation,p_input_hash,
      case when p_operation='CreateUser' then gen_random_uuid() else p_target_id end,'profiles',p_target_id,p_actor_id) on conflict do nothing;
  select * into entry from public.operation_requests where organization_id=p_organization_id and actor_key='user:'||p_actor_id and operation=p_operation and request_id=p_request_id for update;
  if entry.input_hash<>p_input_hash then perform private.fail('CONFLICT'); end if;
  if entry.status='completed' then return to_jsonb(entry); end if;
  if entry.status='processing' and entry.updated_at>now()-interval '2 minutes' then perform private.fail('CONFLICT'); end if;
  select count(*) into recent from public.operation_requests where organization_id=p_organization_id and actor_user_id=p_actor_id and created_at>now()-interval '1 minute';
  if recent>20 then perform private.fail('FORBIDDEN'); end if;
  update public.operation_requests set status='processing',error_code=null,updated_at=now(),revision=revision+1 where id=entry.id returning * into entry;
  return to_jsonb(entry);
end $$;

create or replace function public.h02_admin_stage(p_operation_id uuid, p_input jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare entry public.operation_requests; profile public.profiles;
begin
  if auth.role()<>'service_role' then perform private.fail('FORBIDDEN'); end if;
  select * into entry from public.operation_requests where id=p_operation_id and status='processing' for update;
  if entry.id is null then perform private.fail('CONFLICT'); end if;
  perform private.assert_member(entry.organization_id,entry.actor_user_id,true);
  if entry.operation='CreateUser' then return; end if;
  select * into profile from public.profiles where user_id=entry.external_identity_id for update;
  if profile.deleted_at is not null then perform private.fail('FORBIDDEN'); end if;
  -- A previous failed attempt may already have performed this durable stage.
  if entry.result->>'status'='db_staged' then return; end if;
  if (p_input->>'expected_revision')::integer is distinct from profile.revision then perform private.fail('CONFLICT'); end if;
  update public.profiles set enabled=case when entry.operation='SetUserEnabled' and not (p_input->>'enabled')::boolean then false else enabled end,
    revision=revision+1,updated_at=now(),updated_by=entry.actor_user_id where user_id=profile.user_id;
  update public.app_sessions set revoked_at=now(),revocation_reason=entry.operation,updated_at=now(),updated_by=entry.actor_user_id,revision=revision+1
    where user_id=profile.user_id and revoked_at is null;
  update public.operation_requests set result=jsonb_build_object('schema_version',1,'user_id',profile.user_id,'status','db_staged'),revision=revision+1 where id=entry.id;
end $$;

alter table public.companies add foreign key(accountant_id) references public.profiles(user_id) on delete restrict;
alter table public.companies add foreign key(supervisor_id) references public.profiles(user_id) on delete restrict;
alter table public.company_module_settings add foreign key(delivery_responsible_id) references public.profiles(user_id) on delete restrict;
alter table public.app_sessions add foreign key(user_id) references public.profiles(user_id) on delete restrict;
alter table public.app_sessions add constraint session_revocation_complete check ((revoked_at is null and revocation_reason is null) or (revoked_at is not null and revocation_reason is not null and btrim(revocation_reason)<>'' and revoked_at>=registered_at));
alter table public.audit_events add constraint audit_actor_complete check ((actor_kind='user' and actor_user_id is not null and system_actor is null) or (actor_kind='system' and actor_user_id is null and system_actor is not null and btrim(system_actor)<>''));
revoke all on function public.h02_admin_prepare(uuid,uuid,uuid,text,text,uuid),public.h02_admin_stage(uuid,jsonb) from public,anon,authenticated;
