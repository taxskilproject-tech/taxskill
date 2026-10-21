-- A retryable employment failure is pending WITH error_code, never successful progress.
create or replace function public.h08_generation_tick() returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_org uuid; v_rule uuid; v_stage uuid; v_documents jsonb:='{"status":"idle"}';
  v_employment jsonb:='{"status":"idle"}'; v_error boolean:=false; v_progress boolean:=false;
  v_status text; v_claims text:=current_setting('request.jwt.claims',true); v_assignments integer:=0;
begin
  if auth.role() is distinct from 'service_role' and session_user not in ('postgres','supabase_admin') then perform private.fail('FORBIDDEN'); end if;
  if not pg_try_advisory_xact_lock(hashtextextended('taxskill:h08-generation',0)) then return '{"status":"busy"}'::jsonb; end if;
  -- One study and at most 100 destinations per engine. Rotate even when a study fails.
  select o.id into v_org from public.organizations o
  left join private.h08_generation_progress p on p.organization_id=o.id
  where o.status='active' and o.deleted_at is null
    and (now() at time zone 'America/Lima')::time>=(o.settings->>'generation_local_time')::time
  order by p.last_attempt_at nulls first,o.id limit 1 for update of o skip locked;
  if v_org is null then return '{"status":"idle"}'::jsonb; end if;
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  v_rule:=private.h08_pending_rule(v_org);
  v_stage:=private.h08_pending_employment(v_org);
  begin
    if v_rule is not null then
      v_documents:=public.h04_run_generation(v_rule,100);
    else
      v_assignments:=private.h04_reconcile_assignments(v_org,100);
    end if;
    v_error:=coalesce(v_documents->>'ok','true')='false' or coalesce(v_documents->'result'->>'status','')='failed';
    v_progress:=coalesce((v_documents->'result'->>'processed_count')::integer,0)>0
      or coalesce((v_documents->>'assignment_updates')::integer,0)>0 or v_assignments>0;
  exception when others then
    v_error:=true; v_documents:='{"status":"failed","error_code":"DEPENDENCY_UNAVAILABLE"}';
  end;
  begin
    if v_stage is not null then
      v_employment:=public.h05_run_generation(v_stage,100);
      v_error:=v_error or v_employment->>'status'='failed' or v_employment->>'error_code' is not null;
      v_progress:=v_progress or (v_employment->>'error_code' is null and v_employment->>'status' in ('completed','pending'));
    end if;
  exception when others then
    v_error:=true; v_employment:='{"status":"failed","error_code":"DEPENDENCY_UNAVAILABLE"}';
  end;
  v_status:=case when v_error then 'failed'
    when private.h08_pending_rule(v_org) is not null or private.h08_pending_employment(v_org) is not null then 'pending'
    when v_progress then 'completed' else 'idle' end;
  insert into private.h08_generation_progress(organization_id,last_attempt_at,last_progress_at,status,error_code)
  values(v_org,clock_timestamp(),case when v_progress then clock_timestamp() end,v_status,case when v_error then 'DEPENDENCY_UNAVAILABLE' end)
  on conflict(organization_id) do update set last_attempt_at=excluded.last_attempt_at,
    last_progress_at=coalesce(excluded.last_progress_at,h08_generation_progress.last_progress_at),status=excluded.status,error_code=excluded.error_code;
  perform set_config('request.jwt.claims',coalesce(v_claims,''),true);
  return jsonb_build_object('status',v_status,'organization_id',v_org,'documents',v_documents,'employment',v_employment);
end $$;

-- Retain failures until retry, or resolve them when the resource becomes non-operational.
create or replace function public.h06_run_deadlines(
  p_today date default (now() at time zone 'America/Lima')::date,
  p_organization_id uuid default null,p_batch_size integer default 100
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_org uuid; v_previous private.h06_deadline_progress; v_after uuid; v_last uuid; v_obligation public.obligations;
  v_examined integer:=0; v_thresholds integer:=0; v_more boolean; v_failed uuid;
begin
  if auth.role() is distinct from 'service_role' and session_user<>'postgres' then perform private.fail('FORBIDDEN'); end if;
  if p_today is null or p_batch_size is null or p_batch_size not between 1 and 250 then perform private.fail('VALIDATION_ERROR'); end if;
  if not pg_try_advisory_xact_lock(hashtextextended('taxskill:h06-deadlines',0)) then return '{"status":"busy"}'::jsonb; end if;
  select o.id into v_org from public.organizations o
  left join private.h06_deadline_progress p on p.organization_id=o.id
  where o.status='active' and o.deleted_at is null and (p_organization_id is null or o.id=p_organization_id)
    and exists(select 1 from public.obligations b where b.organization_id=o.id and b.disposition='active')
  order by p.last_attempt_at nulls first,o.id limit 1 for update of o skip locked;
  if v_org is null then return '{"status":"idle"}'::jsonb; end if;
  select * into v_previous from private.h06_deadline_progress where organization_id=v_org;
  v_failed:=v_previous.failed_obligation_id;
  if v_failed is not null and not exists(select 1 from public.obligations b where b.organization_id=v_org and b.id=v_failed and private.h06_operational(b)) then v_failed:=null; end if;
  v_after:=case when v_previous.scan_date=p_today then v_previous.last_obligation_id end;
  for v_obligation in select b.* from public.obligations b where b.organization_id=v_org
    and (v_after is null or b.id>v_after) and private.h06_deadline_candidate(b)
    order by b.id limit p_batch_size loop
    begin
      v_thresholds:=v_thresholds+private.h06_process_deadline(v_obligation,p_today);
      if v_failed=v_obligation.id then v_failed:=null; end if;
    exception when others then
      v_failed:=v_obligation.id;
    end;
    v_last:=v_obligation.id; v_examined:=v_examined+1;
  end loop;
  select exists(select 1 from public.obligations b where b.organization_id=v_org
    and (v_last is null or b.id>v_last) and private.h06_deadline_candidate(b)) into v_more;
  insert into private.h06_deadline_progress(organization_id,scan_date,last_obligation_id,last_attempt_at,last_progress_at,completed_at,error_code,failed_obligation_id)
  values(v_org,p_today,case when v_more then v_last end,clock_timestamp(),case when v_examined>0 then clock_timestamp() end,
    case when not v_more then clock_timestamp() end,case when v_failed is not null then 'DEPENDENCY_UNAVAILABLE' end,v_failed)
  on conflict(organization_id) do update set scan_date=excluded.scan_date,last_obligation_id=excluded.last_obligation_id,
    last_attempt_at=excluded.last_attempt_at,last_progress_at=coalesce(excluded.last_progress_at,h06_deadline_progress.last_progress_at),
    completed_at=coalesce(excluded.completed_at,h06_deadline_progress.completed_at),error_code=excluded.error_code,failed_obligation_id=excluded.failed_obligation_id;
  return jsonb_build_object('status',case when v_failed is not null then 'failed' when v_more then 'pending' else 'completed' end,
    'organization_id',v_org,'examined_obligations',v_examined,'examined_thresholds',v_thresholds,'has_more',v_more);
end $$;
