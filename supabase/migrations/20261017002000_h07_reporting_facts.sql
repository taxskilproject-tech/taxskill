-- H07: common facts. No stored percentages and no new business tables.
create function private.h07_required(p_class text,p_disposition text,p_required boolean) returns boolean
language sql immutable set search_path='' as $$
  select p_class='documentary' and p_disposition='active' and p_required;
$$;

create view private.h07_facts as
select s.*,c.ruc,coalesce(c.legal_name,s.company_name,'Interna del estudio') scope_name,
  p.start_date period_start,p.end_date period_end,o.document_type_id,
  coalesce(t.name,'Actividad adicional') document_type,w.identity_number worker_identity,
  case when c.deleted_at is not null or w.deleted_at is not null then 'deleted'
    when c.status is not null and c.status<>'active' then 'inactive' else 'active' end record_status,
  private.h07_required(s.class,s.disposition,s.is_required) required,
  private.h07_required(s.class,s.disposition,s.is_required) and s.aggregate_state='aprobado' approved,
  coalesce(f.review_files,0) review_files,coalesce(h.late_cycles,0) late_cycles,
  coalesce(h.submitted_cycles,0) submitted_cycles,h.last_submitted_at
from public.h03_obligation_summary s join public.obligations o on o.id=s.id
join public.periods p on p.id=o.period_id
left join public.companies c on c.id=s.company_id
left join public.workers w on w.id=s.worker_id
left join public.document_types t on t.id=o.document_type_id
left join lateral(select count(*) filter(where d.review_state='por_revisar')::integer review_files
  from public.deliverables d where d.obligation_id=s.id) f on true
left join lateral(select count(*) filter(where sc.first_submitted_at is not null)::integer submitted_cycles,
  count(*) filter(where (sc.first_submitted_at at time zone 'America/Lima')::date>sc.due_date)::integer late_cycles,
  max(sc.first_submitted_at) last_submitted_at from public.submission_cycles sc
  join public.deliverables d on d.id=sc.deliverable_id where d.obligation_id=s.id) h on true;

create function private.h07_validate(p_input jsonb) returns void language plpgsql set search_path='' as $$
declare k text;
begin
  if jsonb_typeof(p_input)<>'object' then perform private.fail('VALIDATION_ERROR'); end if;
  for k in select jsonb_object_keys(p_input) loop
    if k<>all(array['company_id','scope','module','class','state','q','period','year','month','worker_id','document_type_id',
      'due_from','due_to','include_deleted','report','page','pageSize','sort','actor_id','resource','action','from','to']) then perform private.fail('VALIDATION_ERROR'); end if;
  end loop;
  if coalesce(p_input->>'scope','all') not in ('all','company','internal')
    or (p_input->>'module' is not null and p_input->>'module' not in ('tributario','laboral_trabajador','laboral_general','actividades'))
    or (p_input->>'class' is not null and p_input->>'class' not in ('documentary','additional'))
    or coalesce(p_input->>'report','detail') not in ('detail','compliance','pending','deadlines','observed','period')
    or (p_input->>'state' is not null and p_input->>'state' not in ('pendiente','por_revisar','observado','aprobado','no_aplica','cancelled'))
    or coalesce(p_input->>'sort','due') not in ('due','title','period')
    or coalesce((p_input->>'page')::integer,1) not between 1 and 100000
    or coalesce((p_input->>'pageSize')::integer,25) not in (25,50,100,500)
    or length(coalesce(p_input->>'q',''))>200
    or (p_input->>'year' is not null and (p_input->>'year')::integer not between 1900 and 9999)
    or (p_input->>'month' is not null and (p_input->>'month')::integer not between 1 and 12)
    or (p_input->>'due_from')::date>(p_input->>'due_to')::date
    or (p_input->>'from')::date>(p_input->>'to')::date then perform private.fail('VALIDATION_ERROR'); end if;
end $$;

create function private.h07_visible(p_org uuid,p_actor uuid,p_company uuid,p_module text,p_action text,p_history boolean)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.organization_members m where m.organization_id=p_org and m.user_id=p_actor
    and m.active and m.deleted_at is null and (not p_history or m.is_admin)
    and (p_company is not null or m.member_type='internal')
    and (m.is_admin or private.has_permission(p_org,p_actor,p_company,p_module,p_action)));
$$;

create function private.h07_rows(p_org uuid,p_actor uuid,p_input jsonb,p_action text)
returns setof private.h07_facts language sql stable security definer set search_path='' as $$
  select f.* from private.h07_facts f where f.organization_id=p_org
    and private.h07_visible(p_org,p_actor,f.company_id,f.module,p_action,coalesce((p_input->>'include_deleted')::boolean,false))
    and (coalesce((p_input->>'include_deleted')::boolean,false) or f.record_status='active')
    and (p_input->>'company_id' is null or f.company_id=(p_input->>'company_id')::uuid)
    and (coalesce(p_input->>'scope','all')<>'internal' or f.company_id is null)
    and (coalesce(p_input->>'scope','all')<>'company' or f.company_id is not null)
    and (p_input->>'module' is null or f.module=p_input->>'module')
    and (p_input->>'class' is null or f.class=p_input->>'class')
    and (p_input->>'state' is null or f.aggregate_state=p_input->>'state')
    and (p_input->>'worker_id' is null or f.worker_id=(p_input->>'worker_id')::uuid)
    and (p_input->>'document_type_id' is null or f.document_type_id=(p_input->>'document_type_id')::uuid)
    and (p_input->>'period' is null or f.occurrence_key=p_input->>'period')
    and (p_input->>'year' is null or extract(year from f.period_start)=(p_input->>'year')::integer)
    and (p_input->>'month' is null or extract(month from f.period_start)=(p_input->>'month')::integer)
    and (p_input->>'due_from' is null or f.operational_due_date>=(p_input->>'due_from')::date)
    and (p_input->>'due_to' is null or f.operational_due_date<=(p_input->>'due_to')::date)
    and (coalesce(p_input->>'q','')='' or position(lower(p_input->>'q') in lower(concat_ws(' ',f.title,f.scope_name,f.ruc,f.worker_name,f.worker_identity,f.document_type,f.occurrence_key)))>0)
    and (coalesce(p_input->>'report','detail') in ('detail','compliance','period')
      or p_input->>'report'='pending' and f.disposition='active' and f.aggregate_state<>'aprobado'
      or p_input->>'report'='observed' and f.disposition='active' and f.observed_count>0
      or p_input->>'report'='deadlines' and f.disposition='active' and f.operational_due_date is not null);
$$;

create function private.h07_report(p_org uuid,p_actor uuid,p_input jsonb,p_action text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; upcoming integer;
begin
  select coalesce((settings->>'upcoming_days')::integer,7) into upcoming from public.organizations where id=p_org;
  with facts as materialized(select * from private.h07_rows(p_org,p_actor,p_input,p_action)),
  rows as materialized(select id,company_id,scope_name company_name,ruc,module,class,title,occurrence_key period,
    period_start,period_end,worker_id,worker_name,worker_identity,document_type_id,document_type,aggregate_state state,
    initial_due_date,operational_due_date,approved_count,total_count,observed_count,review_files,required,approved,
    is_required,disposition,overdue,late_cycles,submitted_cycles,last_submitted_at,record_status,revision from facts),
  paged as(select * from rows order by case when coalesce(p_input->>'sort','due')='due' then operational_due_date end nulls last,
    case when p_input->>'sort'='title' then title end,case when p_input->>'sort'='period' then period_start end desc,id
    offset (coalesce((p_input->>'page')::integer,1)-1)*coalesce((p_input->>'pageSize')::integer,25) limit coalesce((p_input->>'pageSize')::integer,25)),
  grouped as(select company_id,scope_name company_name,module,class,count(*) filter(where required)::integer required,
    count(*) filter(where approved)::integer approved from facts group by company_id,scope_name,module,class)
  select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r)) from paged r),'[]'),'count',(select count(*) from facts),
    'fingerprint',(select md5(coalesce(jsonb_agg(to_jsonb(r) order by id),'[]')::text) from rows r),
    'queried_at',statement_timestamp(),'groups',coalesce((select jsonb_agg(to_jsonb(g) order by company_name,module,class) from grouped g),'[]'),
    'metrics',(select jsonb_build_object('companies',count(distinct company_id) filter(where record_status='active'),
      'required',count(*) filter(where required),'approved',count(*) filter(where approved),
      'additional_required',count(*) filter(where class='additional' and disposition='active' and is_required),
      'additional_approved',count(*) filter(where class='additional' and disposition='active' and is_required and aggregate_state='aprobado'),
      'pending',count(*) filter(where disposition='active' and aggregate_state<>'aprobado'),
      'review_files',coalesce(sum(review_files) filter(where disposition='active'),0),
      'observed_files',coalesce(sum(observed_count) filter(where disposition='active'),0),
      'overdue',count(*) filter(where overdue),'upcoming',count(*) filter(where disposition='active' and operational_due_date between (now() at time zone 'America/Lima')::date and (now() at time zone 'America/Lima')::date+upcoming)) from facts)) into result;
  return result;
end $$;

-- Restrict helpers. Access is admitted through the authenticated RPC only.
revoke all on private.h07_facts from public,anon,authenticated;
revoke all on function private.h07_required(text,text,boolean),private.h07_validate(jsonb),private.h07_visible(uuid,uuid,uuid,text,text,boolean),
  private.h07_rows(uuid,uuid,jsonb,text),private.h07_report(uuid,uuid,jsonb,text) from public,anon,authenticated;

create index audit_h07_date on public.audit_events(organization_id,created_at desc,id);
create index audit_h07_company on public.audit_events(organization_id,company_id,module,created_at desc);
create index cycles_h07_history on public.submission_cycles(organization_id,deliverable_id) include(first_submitted_at,due_date);
create index obligations_h07_period on public.obligations(organization_id,period_id,company_id,module);
