-- Preserve the existing permission checks and expose only aggregate technical progress.
alter function public.h08_health(uuid) set schema private;
alter function private.h08_health(uuid) rename to h08_generation_health;
revoke all on function private.h08_generation_health(uuid) from public,anon,authenticated;
create function public.h08_health(p_organization_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_result jsonb; v_progress private.h06_digest_progress;
begin
  v_result:=private.h08_generation_health(p_organization_id);
  if v_result->>'ok' is distinct from 'true' then return v_result; end if;
  select * into v_progress from private.h06_digest_progress where organization_id=p_organization_id;
  return jsonb_set(v_result,'{data}',v_result->'data'||jsonb_build_object(
    'automation_failures',coalesce((v_result->'data'->>'automation_failures')::integer,0)+case when v_progress.error_code is not null then 1 else 0 end,
    'digest_pending_since',case when v_progress.last_recipient_id is not null then v_progress.last_progress_at end,
    'digest_last_progress_at',v_progress.last_progress_at));
end $$;
revoke all on function public.h08_health(uuid) from public,anon;
grant execute on function public.h08_health(uuid) to authenticated,service_role;
notify pgrst,'reload schema';
