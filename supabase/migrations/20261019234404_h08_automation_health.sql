alter function public.h08_health(uuid) set schema private;
alter function private.h08_health(uuid) rename to h08_base_health;
revoke all on function private.h08_base_health(uuid) from public,anon,authenticated;

create function public.h08_health(p_organization_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_result jsonb; v_generation private.h08_generation_progress; v_deadlines private.h06_deadline_progress;
  v_org public.organizations; v_pending boolean; v_since timestamptz; v_failures integer;
begin
  v_result:=private.h08_base_health(p_organization_id);
  if v_result->>'ok' is distinct from 'true' then return v_result; end if;
  select * into v_org from public.organizations where id=p_organization_id;
  select * into v_generation from private.h08_generation_progress where organization_id=p_organization_id;
  select * into v_deadlines from private.h06_deadline_progress where organization_id=p_organization_id;
  v_pending:=v_org.status='active' and v_org.deleted_at is null
    and (private.h08_pending_rule(p_organization_id) is not null or private.h08_pending_employment(p_organization_id) is not null);
  if v_pending then
    v_since:=greatest(((now() at time zone 'America/Lima')::date+(v_org.settings->>'generation_local_time')::time) at time zone 'America/Lima',
      coalesce(v_generation.last_progress_at,v_org.created_at));
  end if;
  v_failures:=(case when v_generation.error_code is not null then 1 else 0 end)+(case when v_deadlines.error_code is not null then 1 else 0 end);
  return jsonb_set(v_result,'{data}',v_result->'data'||jsonb_build_object(
    'automation_failures',v_failures,'generation_pending_since',v_since,
    'generation_last_progress_at',v_generation.last_progress_at,
    'deadline_pending_since',case when v_deadlines.last_obligation_id is not null then v_deadlines.last_progress_at end,
    'deadline_last_progress_at',v_deadlines.last_progress_at));
end $$;
revoke all on function public.h08_health(uuid) from public,anon;
grant execute on function public.h08_health(uuid) to authenticated,service_role;
notify pgrst,'reload schema';
