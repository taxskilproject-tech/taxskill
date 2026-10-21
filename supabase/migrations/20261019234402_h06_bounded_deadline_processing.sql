create table private.h06_deadline_progress (
  organization_id uuid primary key references public.organizations(id) on delete restrict,
  scan_date date not null,
  last_obligation_id uuid,
  last_attempt_at timestamptz not null,
  last_progress_at timestamptz,
  completed_at timestamptz,
  error_code text check(error_code is null or error_code='DEPENDENCY_UNAVAILABLE'),
  failed_obligation_id uuid,
  foreign key(organization_id,failed_obligation_id) references public.obligations(organization_id,id) on delete restrict
);
alter table private.h06_deadline_progress enable row level security;
revoke all on private.h06_deadline_progress from public,anon,authenticated;

-- Cheaply skip stable missing-responsible incidents BEFORE running contextual helpers.
create function private.h06_deadline_candidate(p_obligation public.obligations) returns boolean
language sql stable set search_path='' as $$
  select p_obligation.disposition='active' and
    (p_obligation.delivery_responsible_id is not null or not p_obligation.assignment_issue
      or not exists(select 1 from public.notification_events e where e.organization_id=p_obligation.organization_id
        and e.event_key='assignment_issue:'||p_obligation.id||':none:'||p_obligation.revision));
$$;

create function private.h06_process_deadline(p_obligation public.obligations,p_today date) returns integer
language plpgsql security definer set search_path='' as $$
declare v_obligation public.obligations:=p_obligation; v_issue boolean; v_cycle record; v_count integer:=0;
begin
  if not private.h06_operational(v_obligation) then return 0; end if;
  v_issue:=v_obligation.delivery_responsible_id is null or not private.has_permission(v_obligation.organization_id,
    v_obligation.delivery_responsible_id,v_obligation.company_id,v_obligation.module,'upload');
  if v_obligation.assignment_issue is distinct from v_issue then
    update public.obligations set assignment_issue=v_issue,revision=revision+1,updated_at=now(),updated_by=null
      where id=v_obligation.id returning * into v_obligation;
  end if;
  if v_issue then
    if not exists(select 1 from public.notification_events where organization_id=v_obligation.organization_id
      and event_key='assignment_issue:'||v_obligation.id||':'||coalesce(v_obligation.delivery_responsible_id::text,'none')||':'||v_obligation.revision) then
      perform private.h06_event(v_obligation,null,'assignment_issue','assignment_issue:'||v_obligation.id||':'||coalesce(v_obligation.delivery_responsible_id::text,'none')||':'||v_obligation.revision);
    end if;
    return 0;
  end if;
  for v_cycle in select c.id,c.due_date from public.submission_cycles c join public.deliverables d on d.id=c.deliverable_id
    where d.obligation_id=v_obligation.id and c.state='open' and c.first_submitted_at is null
      and c.due_date-p_today=any(array[7,3,1,0,-1])
      and not exists(select 1 from public.notification_events e where e.organization_id=v_obligation.organization_id
        and e.event_key='deadline:'||c.id||':'||(c.due_date-p_today)) loop
    perform private.h06_event(v_obligation,null,case when v_cycle.due_date<p_today then 'overdue'
      when v_cycle.due_date=p_today then 'due_today' else 'due_soon' end,
      'deadline:'||v_cycle.id||':'||(v_cycle.due_date-p_today),null,v_cycle.id,v_cycle.due_date-p_today);
    v_count:=v_count+1;
  end loop;
  return v_count;
end $$;

drop function public.h06_run_deadlines(date);
create function public.h06_run_deadlines(
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
revoke all on function private.h06_deadline_candidate(public.obligations),private.h06_process_deadline(public.obligations,date) from public,anon,authenticated;
revoke all on function public.h06_run_deadlines(date,uuid,integer) from public,anon,authenticated;
grant execute on function public.h06_run_deadlines(date,uuid,integer) to service_role;
