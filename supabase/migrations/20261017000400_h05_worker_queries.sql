create or replace view public.h03_obligation_summary with (security_invoker=true) as
select o.id,o.organization_id,o.company_id,o.module,o.class,o.title,o.description,o.initial_due_date,o.delivery_responsible_id,o.assignment_issue,o.priority,o.is_required,o.disposition,o.disposition_reason,o.period_id,o.occurrence_key,o.revision,o.created_at,
  o.snapshot->'destination'->>'company_legal_name' as company_name,
  a.total_count,a.approved_count,a.observed_count,a.pending_count,a.operational_due_date,
  case when o.disposition<>'active' then o.disposition when a.approved_count=a.total_count and a.total_count>0 then 'aprobado'
    when a.observed_count>0 then 'observado' when a.pending_count>0 then 'pendiente' else 'por_revisar' end as aggregate_state,
  coalesce(a.operational_due_date<(now() at time zone 'America/Lima')::date,false) and o.disposition='active' as overdue
,o.employment_period_id,w.id worker_id,concat_ws(' ',w.first_names,w.last_names) worker_name,e.sequence_number employment_sequence,
  case when rv.applicability_conditions->>'employment_stage' in ('ingreso','cese') then rv.applicability_conditions->>'employment_stage' else 'relacion' end employment_stage
from public.obligations o left join public.employment_periods e on e.id=o.employment_period_id and e.organization_id=o.organization_id
left join public.workers w on w.id=e.worker_id and w.organization_id=e.organization_id
left join public.rule_versions rv on rv.id=o.rule_version_id and rv.organization_id=o.organization_id
cross join lateral (
  select count(*)::integer total_count,count(*) filter(where d.review_state='aprobado')::integer approved_count,
    count(*) filter(where d.review_state='observado')::integer observed_count,
    count(*) filter(where d.review_state='pendiente')::integer pending_count,
    (select min(c.due_date) from public.submission_cycles c join public.deliverables s on s.id=c.deliverable_id where s.obligation_id=o.id and c.state='open' and c.first_submitted_at is null) operational_due_date
  from public.deliverables d where d.obligation_id=o.id and d.organization_id=o.organization_id
) a;
revoke all on public.h03_obligation_summary from anon;
grant select on public.h03_obligation_summary to authenticated,service_role;


create function public.h05_query(p_organization_id uuid,p_resource text,p_input jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_company public.companies; v_worker public.workers; v_stage public.employment_periods; v_member public.organization_members; v_result jsonb;
  v_start integer:=least(greatest(coalesce((p_input->>'page')::integer,1)-1,0),100000)*25;
  v_deleted boolean:=coalesce((p_input->>'include_deleted')::boolean,false); v_status text:=coalesce(p_input->>'status','all'); v_q text:=lower(coalesce(p_input->>'q',''));
begin
  v_member:=private.assert_member(p_organization_id,auth.uid()); perform private.admit_session(p_organization_id);
  v_company:=private.h05_company_access(p_organization_id,(p_input->>'company_id')::uuid,auth.uid(),'view');
  if v_deleted and not v_member.is_admin then perform private.fail('FORBIDDEN'); end if;
  if p_resource='workers' then
    with visible as(select w.id,w.company_id,w.identity_type,w.identity_number,w.first_names,w.last_names,w.revision,w.deleted_at,w.deletion_reason,
      case when exists(select 1 from public.employment_periods e where e.worker_id=w.id and e.end_date is null) then 'active'
        when exists(select 1 from public.employment_periods e where e.worker_id=w.id) then 'ended' else 'unregistered' end employment_status
      from public.workers w where w.organization_id=p_organization_id and w.company_id=v_company.id and (v_deleted or w.deleted_at is null)
        and (v_q='' or position(v_q in lower(w.first_names||' '||w.last_names||' '||w.identity_number))>0)), filtered as(select * from visible where v_status='all' or employment_status=v_status)
    select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from filtered order by last_names,first_names,id offset v_start limit 25) r),'[]'),
      'count',(select count(*) from filtered)) into v_result;
  elsif p_resource='worker' then
    select * into v_worker from public.workers where organization_id=p_organization_id and company_id=v_company.id and id=(p_input->>'worker_id')::uuid and (deleted_at is null or v_member.is_admin);
    if v_worker.id is null then perform private.fail('NOT_FOUND'); end if;
    if p_input->>'employment_period_id' is not null then
      select * into v_stage from public.employment_periods where organization_id=p_organization_id and company_id=v_company.id and worker_id=v_worker.id and id=(p_input->>'employment_period_id')::uuid;
      if v_stage.id is null then perform private.fail('NOT_FOUND'); end if;
    else select * into v_stage from public.employment_periods where organization_id=p_organization_id and worker_id=v_worker.id order by (end_date is null) desc,sequence_number desc limit 1; end if;
    v_result:=jsonb_build_object('worker',to_jsonb(v_worker),'company_name',v_company.legal_name,'company_status',v_company.status,
      'selected_period',case when v_stage.id is not null then to_jsonb(v_stage)||jsonb_build_object('reference_salary',v_stage.reference_salary::text) else 'null'::jsonb end,
      'period_rows',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (select id,sequence_number,start_date,end_date,revision from public.employment_periods where organization_id=p_organization_id and worker_id=v_worker.id order by sequence_number desc offset v_start limit 25) r),
      'period_count',(select count(*) from public.employment_periods where organization_id=p_organization_id and worker_id=v_worker.id));
  else perform private.fail('VALIDATION_ERROR'); end if;
  return jsonb_build_object('ok',true,'data',v_result);
exception when others then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',case when sqlstate='P0001' and sqlerrm in ('FORBIDDEN','NOT_FOUND','UNAUTHENTICATED') then sqlerrm else 'VALIDATION_ERROR' end));
end $$;
revoke all on function public.h05_query(uuid,text,jsonb) from public,anon;
grant execute on function public.h05_query(uuid,text,jsonb) to authenticated;

alter function public.h03_query(uuid,text,jsonb) rename to h03_query_h04;
alter function public.h03_query_h04(uuid,text,jsonb) set schema private;
revoke all on function private.h03_query_h04(uuid,text,jsonb) from public,anon,authenticated;
create function public.h03_query(p_organization_id uuid,p_resource text,p_input jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_member public.organization_members; v_result jsonb; v_stage public.employment_periods;
  v_start integer:=least(greatest(coalesce((p_input->>'page')::integer,1)-1,0),100000)*25;
begin
  if p_resource<>'list' then return private.h03_query_h04(p_organization_id,p_resource,p_input); end if;
  v_member:=private.assert_member(p_organization_id,auth.uid()); perform private.admit_session(p_organization_id);
  if p_input->>'employment_period_id' is not null then
    select * into v_stage from public.employment_periods where organization_id=p_organization_id and id=(p_input->>'employment_period_id')::uuid
      and company_id=(p_input->>'company_id')::uuid and worker_id=(p_input->>'worker_id')::uuid;
    if v_stage.id is null then perform private.fail('NOT_FOUND'); end if;
    perform private.h05_company_access(p_organization_id,v_stage.company_id,auth.uid(),'view');
  end if;
  with visible as(select s.* from public.h03_obligation_summary s join public.companies c on c.organization_id=s.organization_id and c.id=s.company_id
    where s.organization_id=p_organization_id and c.deleted_at is null and (p_input->>'company_id' is null or s.company_id=(p_input->>'company_id')::uuid)
      and (v_member.is_admin or private.has_permission(p_organization_id,auth.uid(),s.company_id,s.module,'view'))
      and (coalesce(p_input->>'module','')='' or s.module=p_input->>'module')
      and (v_stage.id is null or s.employment_period_id=v_stage.id)
      and (coalesce(p_input->>'employment_stage','')='' or s.employment_stage=p_input->>'employment_stage')
      and (coalesce(p_input->>'state','')='' or s.aggregate_state=p_input->>'state')
      and (coalesce(p_input->>'period','')='' or s.occurrence_key=p_input->>'period')
      and (coalesce(p_input->>'q','')='' or position(lower(p_input->>'q') in lower(s.title||' '||coalesce(s.worker_name,'')))>0))
    select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from visible order by overdue desc,operational_due_date nulls last,id offset v_start limit 25) r),'[]'),
      'count',(select count(*) from visible)) into v_result;
  return jsonb_build_object('ok',true,'data',v_result);
exception when others then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',case when sqlstate='P0001' and sqlerrm in ('FORBIDDEN','NOT_FOUND','UNAUTHENTICATED') then sqlerrm else 'VALIDATION_ERROR' end));
end $$;
revoke all on function public.h03_query(uuid,text,jsonb) from public,anon;
grant execute on function public.h03_query(uuid,text,jsonb) to authenticated;

