-- Observe preparation that never started, including expiration pages without a recipient cursor.
create or replace function public.h08_health(p_organization_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_result jsonb; v_progress private.h06_digest_progress; v_org public.organizations; v_pending boolean; v_since timestamptz;
begin
  v_result:=private.h08_generation_health(p_organization_id);
  if v_result->>'ok' is distinct from 'true' then return v_result; end if;
  select * into v_progress from private.h06_digest_progress where organization_id=p_organization_id;
  select * into v_org from public.organizations where id=p_organization_id;
  v_pending:=v_org.status='active' and v_org.deleted_at is null
    and (now() at time zone 'America/Lima')::time>=(v_org.settings->>'digest_local_time')::time
    and (exists(select 1 from private.h06_digest_recipients(p_organization_id,(now() at time zone 'America/Lima')::date,null,1))
      or exists(select 1 from public.whatsapp_digests d where d.organization_id=p_organization_id and d.status='pending'
        and d.accepted_at is null and d.expired_at is null and d.local_date<(now() at time zone 'America/Lima')::date));
  if v_pending then
    v_since:=greatest(((now() at time zone 'America/Lima')::date+(v_org.settings->>'digest_local_time')::time) at time zone 'America/Lima',
      coalesce(v_progress.last_progress_at,v_org.created_at));
  end if;
  return jsonb_set(v_result,'{data}',v_result->'data'||jsonb_build_object(
    'automation_failures',coalesce((v_result->'data'->>'automation_failures')::integer,0)+case when v_progress.error_code is not null then 1 else 0 end,
    'digest_pending_since',v_since,'digest_last_progress_at',v_progress.last_progress_at));
end $$;
