create function private.revoke_unavailable_sessions() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name='profiles' then
    if not new.enabled or new.deleted_at is not null or new.provisioning_status<>'ready' then
      update public.app_sessions set revoked_at=now(),revocation_reason='profile_unavailable',updated_at=now(),updated_by=new.updated_by,revision=revision+1
        where user_id=new.user_id and revoked_at is null;
    end if;
  elsif tg_table_name='organization_members' then
    if not new.active or new.deleted_at is not null then
      update public.app_sessions set revoked_at=now(),revocation_reason='membership_unavailable',updated_at=now(),updated_by=new.updated_by,revision=revision+1
        where organization_id=new.organization_id and user_id=new.user_id and revoked_at is null;
    end if;
  end if;
  return new;
end $$;
create trigger profile_revoke_sessions after update on public.profiles for each row execute function private.revoke_unavailable_sessions();
create trigger membership_revoke_sessions after update on public.organization_members for each row execute function private.revoke_unavailable_sessions();
revoke all on function private.revoke_unavailable_sessions() from public,anon,authenticated;
