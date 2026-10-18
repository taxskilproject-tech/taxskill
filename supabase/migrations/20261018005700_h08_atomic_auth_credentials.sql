-- Auth writes the password before app_metadata in the SAME transaction. Validate its final state at commit.
create or replace function private.h08_guard_auth_credentials() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_marker text;
begin
  if new.email is distinct from old.email or new.phone is distinct from old.phone
    or coalesce(new.email_change,'')<>'' or coalesce(new.phone_change,'')<>'' then
    raise exception 'Account changes require the administrator';
  end if;
  if new.encrypted_password is not distinct from old.encrypted_password then return new; end if;
  select raw_app_meta_data->>'taxskill_password_request_id' into v_marker from auth.users where id=new.id;
  if v_marker is null or v_marker is not distinct from old.raw_app_meta_data->>'taxskill_password_request_id'
    or not exists(select 1 from public.operation_requests r where r.id::text=v_marker and r.external_identity_id=new.id
      and r.operation='SetUserPassword' and r.status='processing' and r.result->>'status'='db_staged'
      and r.updated_at>now()-interval '2 minutes') then
    raise exception 'Password changes require the administrator';
  end if;
  return new;
end $$;
drop trigger h08_guard_auth_credentials on auth.users;
create constraint trigger h08_guard_auth_credentials after update on auth.users
deferrable initially deferred for each row execute function private.h08_guard_auth_credentials();
