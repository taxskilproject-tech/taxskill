-- Admission is produced by Auth, never by a browser call. Existing sessions must log in again.
update public.app_sessions set revoked_at=now(),revocation_reason='h08_security_activation',
  updated_at=now(),revision=revision+1 where revoked_at is null;

create function private.h08_session_id() returns uuid
language sql stable set search_path='' as $$
  select case when auth.jwt()->>'session_id' ~ '^[0-9a-fA-F-]{36}$'
    then (auth.jwt()->>'session_id')::uuid end;
$$;

create function private.h08_session_valid(p_org uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.app_sessions a
    join auth.sessions s on s.id=a.session_id and s.user_id=a.user_id
    join public.profiles p on p.user_id=a.user_id
    join public.organization_members m on m.organization_id=a.organization_id and m.user_id=a.user_id
    where a.organization_id=p_org and a.user_id=auth.uid() and a.session_id=private.h08_session_id()
      and a.revoked_at is null and (s.not_after is null or s.not_after>now())
      and p.enabled and p.deleted_at is null and p.provisioning_status='ready'
      and m.active and m.deleted_at is null);
$$;

create function private.h08_auth_session_inserted() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.app_sessions(organization_id,user_id,session_id,created_by)
    select m.organization_id,new.user_id,new.id,new.user_id from public.organization_members m
    join public.profiles p on p.user_id=m.user_id
    where m.user_id=new.user_id and m.active and m.deleted_at is null
      and p.enabled and p.deleted_at is null and p.provisioning_status='ready'
    on conflict(organization_id,session_id) do nothing;
  return new;
end $$;
create trigger h08_auth_session_inserted after insert on auth.sessions
for each row execute function private.h08_auth_session_inserted();

create function private.h08_auth_session_deleted() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  update public.app_sessions set revoked_at=now(),revocation_reason='auth_session_removed',
    updated_at=now(),revision=revision+1 where session_id=old.id and revoked_at is null;
  return old;
end $$;
create trigger h08_auth_session_deleted after delete on auth.sessions
for each row execute function private.h08_auth_session_deleted();

create or replace function private.admit_session(org uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform private.assert_member(org,auth.uid(),false,true);
  if not private.h08_session_valid(org) then perform private.fail('UNAUTHENTICATED'); end if;
end $$;

-- Auth exposes updateUser directly. Only a new administrative operation marker may change credentials.
create function private.h08_guard_auth_credentials() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_marker text:=new.raw_app_meta_data->>'taxskill_password_request_id';
begin
  if new.email is distinct from old.email or new.phone is distinct from old.phone
    or coalesce(new.email_change,'')<>'' or coalesce(new.phone_change,'')<>'' then
    raise exception 'Account changes require the administrator';
  end if;
  if new.encrypted_password is not distinct from old.encrypted_password then return new; end if;
  if v_marker is null or v_marker is not distinct from old.raw_app_meta_data->>'taxskill_password_request_id'
    or not exists(select 1 from public.operation_requests r
      where r.id::text=v_marker and r.external_identity_id=new.id and r.operation='SetUserPassword'
        and r.status='processing' and r.result->>'status'='db_staged'
        and r.updated_at>now()-interval '2 minutes') then
    raise exception 'Password changes require the administrator';
  end if;
  return new;
end $$;
create trigger h08_guard_auth_credentials before update on auth.users
for each row execute function private.h08_guard_auth_credentials();

create function public.h08_block_auth_email(event jsonb) returns jsonb
language sql set search_path='' as $$
  select '{"error":{"http_code":403,"message":"Contacta al administrador para gestionar tu acceso."}}'::jsonb;
$$;
revoke all on function public.h08_block_auth_email(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.h08_block_auth_email(jsonb) to supabase_auth_admin;

-- Bootstrap serializes the empty-study check, including logically deleted studies.
alter function public.h02_bootstrap(uuid,text) set schema private;
alter function private.h02_bootstrap(uuid,text) rename to h08_bootstrap_once;
create function public.h02_bootstrap(p_user_id uuid,p_name text) returns uuid
language plpgsql security definer set search_path='' as $$
begin
  if auth.role()<>'service_role' then perform private.fail('FORBIDDEN'); end if;
  perform pg_advisory_xact_lock(hashtextextended('taxskill:bootstrap',0));
  if exists(select 1 from public.organizations) then perform private.fail('CONFLICT'); end if;
  return private.h08_bootstrap_once(p_user_id,p_name);
end $$;
revoke all on function public.h02_bootstrap(uuid,text) from public,anon,authenticated;
grant execute on function public.h02_bootstrap(uuid,text) to service_role;
revoke all on all functions in schema private from public,anon,authenticated;
