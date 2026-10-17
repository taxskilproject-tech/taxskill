-- Realtime carries only an invalidation marker. Notice content remains behind h06_query.
-- Private Broadcast authorization is part of H08; no browser SELECT grant is introduced here.
create function private.h06_broadcast_notice() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  perform realtime.send('{"changed":true}'::jsonb,'changed',
    'personal-notices:'||new.organization_id||':'||new.recipient_id,false);
  return new;
end $$;
revoke all on function private.h06_broadcast_notice() from public,anon,authenticated;
create trigger h06_notice_invalidation after insert or update of read_at on public.notifications
for each row execute function private.h06_broadcast_notice();
alter publication supabase_realtime drop table public.notifications;
