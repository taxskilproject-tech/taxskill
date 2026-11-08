-- H11: read-only projections. Historical cycles and report formulas are preserved.
create function private.h11_legacy_filters(input jsonb) returns jsonb
language sql immutable set search_path='' as $$
 select input-'assistant_id'-'document_month'-'document_view'-'delivery_indicator';
$$;

create function private.h11_validate(input jsonb) returns void
language plpgsql set search_path='' as $$
begin
 perform private.h07_validate(private.h11_legacy_filters(input));
 if input ? 'assistant_id' then
  if jsonb_typeof(input->'assistant_id') is distinct from 'string' then perform private.fail('VALIDATION_ERROR'); end if;
  perform (input->>'assistant_id')::uuid;
 end if;
 if input ? 'document_month' then
  if coalesce(input->>'document_month','') !~ '^[12][0-9]{3}-(0[1-9]|1[0-2])$' then perform private.fail('VALIDATION_ERROR'); end if;
 end if;
 if input ? 'document_view' and coalesce(input->>'document_view','') not in ('uploaded','pending')
  or input ? 'delivery_indicator' and coalesce(input->>'delivery_indicator','') not in ('compliance','pending','on_time','late')
 then perform private.fail('VALIDATION_ERROR'); end if;
end $$;

create function private.h11_assistant(org uuid,actor uuid,input jsonb) returns uuid
language plpgsql stable security definer set search_path='' as $$
declare member public.organization_members; selected uuid:=(input->>'assistant_id')::uuid;
begin
 select * into member from public.organization_members where organization_id=org and user_id=actor;
 if member.member_type='client' then
  if selected is not null and selected<>actor then perform private.fail('FORBIDDEN'); end if;
  return actor;
 end if;
 if selected is not null and not exists(select 1 from public.organization_members m join public.profiles p on p.user_id=m.user_id
  where m.organization_id=org and m.user_id=selected and m.member_type='client'
   and (coalesce((input->>'include_deleted')::boolean,false) or m.active and m.deleted_at is null and p.enabled and p.deleted_at is null))
 then perform private.fail('FORBIDDEN'); end if;
 return selected;
end $$;

create function private.h11_facts(org uuid,actor uuid,input jsonb)
returns setof private.h07_facts language sql stable security definer set search_path='' as $$
 select f.* from private.h07_rows(org,actor,private.h11_legacy_filters(input),'view') f
 where input->>'document_month' is null
  or f.period_start<((input->>'document_month'||'-01')::date+interval '1 month')
   and f.period_end>=(input->>'document_month'||'-01')::date;
$$;

create function private.h11_deliveries(org uuid,actor uuid,input jsonb)
returns table(id uuid,obligation_id uuid,company_id uuid,company_name text,module text,title text,period text,
 label text,worker_name text,state text,reason text,due_date date,received_at timestamptz,
 pending boolean,submitted boolean,late boolean,required boolean,approved boolean,assigned boolean,obligation_due_date date)
language sql stable security definer set search_path='' as $$
 with subject as(select private.h11_assistant(org,actor,input) user_id),
 facts as materialized(select * from private.h11_facts(org,actor,private.h11_legacy_filters(input-'q'-'due_from'-'due_to')
   ||case when input ? 'document_month' then jsonb_build_object('document_month',input->>'document_month') else '{}'::jsonb end))
 select d.id,f.id,f.company_id,f.scope_name,f.module,f.title,f.occurrence_key,d.label,f.worker_name,
 d.review_state,case when input->>'delivery_indicator' in ('late','on_time') then received.reason else open_cycle.reason end,
 deadline.due_date,received.first_submitted_at,
 open_cycle.id is not null and (subject.user_id is null or o.delivery_responsible_id=subject.user_id),
 received.id is not null,coalesce(received.has_late,false),f.required,f.approved,
 subject.user_id is null or o.delivery_responsible_id=subject.user_id,f.operational_due_date
 from facts f join public.obligations o on o.id=f.id
 join public.deliverables d on d.obligation_id=f.id cross join subject
 left join lateral(select sc.id,sc.reason,sc.due_date from public.submission_cycles sc
  where sc.deliverable_id=d.id and sc.state='open' and sc.first_submitted_at is null limit 1) open_cycle on true
 left join lateral(
  select sc.id,sc.reason,sc.due_date,sc.first_submitted_at,
   bool_or((sc.first_submitted_at at time zone 'America/Lima')::date>sc.due_date) over() has_late
  from public.submission_cycles sc
  join lateral(select v.uploaded_by from public.document_versions v where v.cycle_id=sc.id
   order by v.version_number,v.id limit 1) first_version on true
  where sc.deliverable_id=d.id and sc.first_submitted_at is not null
   and (subject.user_id is null or first_version.uploaded_by=subject.user_id)
  order by ((sc.first_submitted_at at time zone 'America/Lima')::date>sc.due_date) desc,
   sc.first_submitted_at desc,sc.id limit 1
 ) received on true
 cross join lateral(select case when input->>'delivery_indicator' in ('late','on_time')
  then received.due_date else coalesce(open_cycle.due_date,received.due_date) end due_date) deadline
 where f.disposition='active'
 and (input->>'due_from' is null or deadline.due_date>=(input->>'due_from')::date)
 and (input->>'due_to' is null or deadline.due_date<=(input->>'due_to')::date)
 and (coalesce(input->>'q','')='' or position(lower(input->>'q') in
  lower(concat_ws(' ',d.label,f.title,f.scope_name,f.ruc,f.worker_name,f.document_type,f.occurrence_key)))>0);
$$;

create function private.h11_company_indicators(org uuid,actor uuid,input jsonb) returns jsonb
language sql stable security definer set search_path='' as $$
 with rows as materialized(select * from private.h11_deliveries(org,actor,input)
  where required and module in ('tributario','laboral_trabajador','laboral_general')),
 companies as(
  select c.id,c.legal_name from public.companies c where c.organization_id=org
   and coalesce(input->>'scope','all')<>'internal'
   and (input->>'company_id' is null or c.id=(input->>'company_id')::uuid)
   and (coalesce((input->>'include_deleted')::boolean,false) or c.status='active' and c.deleted_at is null)
   and exists(select 1 from unnest(array['tributario','laboral_trabajador','laboral_general']) module
    where (input->>'module' is null or module=input->>'module')
     and private.h07_visible(org,actor,c.id,module,'view',coalesce((input->>'include_deleted')::boolean,false)))),
 grouped as(select c.id company_id,c.legal_name company_name,
  count(distinct r.obligation_id) filter(where r.assigned)::integer required,
  count(distinct r.obligation_id) filter(where r.assigned and r.approved)::integer approved,
  count(r.id) filter(where r.pending)::integer pending,
  count(r.id) filter(where r.submitted and not r.late)::integer on_time,
  count(r.id) filter(where r.late)::integer late
  from companies c left join rows r on r.company_id=c.id group by c.id,c.legal_name)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(g)) from(
  select * from grouped order by company_name,company_id
  offset (coalesce((input->>'page')::int,1)-1)*25 limit 25) g),'[]'),
  'count',(select count(*) from grouped),'queried_at',statement_timestamp());
$$;

create function private.h11_delivery_details(org uuid,actor uuid,input jsonb) returns jsonb
language sql stable security definer set search_path='' as $$
 with facts as materialized(select * from private.h11_deliveries(org,actor,input)),
 selected as(
  select id,obligation_id,company_name,module,title,period,label,worker_name,state,reason,due_date,received_at
  from facts where case coalesce(input->>'delivery_indicator','pending')
   when 'pending' then pending when 'on_time' then submitted and not late when 'late' then late else false end
   and (input->>'delivery_indicator' is null or required and module<>'actividades')
  union all
  select distinct obligation_id,obligation_id,company_name,module,title,period,title,worker_name,
   case when approved then 'aprobado' else 'pendiente' end,null::text,obligation_due_date,null::timestamptz
  from facts where input->>'delivery_indicator'='compliance' and required and assigned and module<>'actividades')
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r)) from(
  select * from selected order by due_date nulls last,title,id
  offset (coalesce((input->>'page')::int,1)-1)*coalesce((input->>'pageSize')::int,25)
  limit coalesce((input->>'pageSize')::int,25)) r),'[]'),
  'count',(select count(*) from selected),'queried_at',statement_timestamp());
$$;

create function private.h11_documents(org uuid,actor uuid,input jsonb) returns jsonb
language sql stable security definer set search_path='' as $$
 with subject as(select private.h11_assistant(org,actor,input) user_id),
 facts as materialized(select * from private.h11_facts(org,actor,input-'q')),
 rows as(select v.id,v.original_name,v.extension,v.validated_bytes,v.finalized_at,v.version_number,
  f.id obligation_id,f.company_id,f.scope_name company_name,f.module,f.title,f.worker_name,f.worker_identity,
  f.occurrence_key period,f.document_type,f.aggregate_state state,f.record_status,
  coalesce(d.current_version_id=v.id,false) is_current,v.uploaded_by,p.full_name uploader_name
  from facts f join public.deliverables d on d.obligation_id=f.id
  join public.document_versions v on v.deliverable_id=d.id join public.profiles p on p.user_id=v.uploaded_by cross join subject
  where (subject.user_id is null or v.uploaded_by=subject.user_id)
  and (coalesce(input->>'q','')='' or position(lower(input->>'q') in lower(concat_ws(' ',
   v.original_name,f.title,f.scope_name,f.ruc,f.worker_name,f.worker_identity,f.document_type,f.occurrence_key)))>0))
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r)) from(
  select * from rows order by finalized_at desc,id
  offset (coalesce((input->>'page')::int,1)-1)*coalesce((input->>'pageSize')::int,25)
  limit coalesce((input->>'pageSize')::int,25)) r),'[]'),
  'count',(select count(*) from rows),'queried_at',statement_timestamp());
$$;

create function private.h11_assistants(org uuid,actor uuid,input jsonb) returns jsonb
language sql stable security definer set search_path='' as $$
 with facts as materialized(select * from private.h11_facts(org,actor,input-'assistant_id'-'q')),
 candidates as(
 select m.user_id,p.full_name name,p.email,(m.active and m.deleted_at is null and p.enabled and p.deleted_at is null) active
 from public.organization_members m join public.profiles p on p.user_id=m.user_id
 where m.organization_id=org and m.member_type='client'
  and (not exists(select 1 from public.organization_members me where me.organization_id=org and me.user_id=actor and me.member_type='client') or m.user_id=actor)
  and (coalesce((input->>'include_deleted')::boolean,false) or m.active and m.deleted_at is null and p.enabled and p.deleted_at is null)
  and (
   exists(select 1 from facts f join public.obligations o on o.id=f.id where o.delivery_responsible_id=m.user_id)
   or exists(select 1 from facts f join public.deliverables d on d.obligation_id=f.id
    join public.document_versions v on v.deliverable_id=d.id where v.uploaded_by=m.user_id)
   or exists(select 1 from public.access_grants g where g.organization_id=org and g.member_id=m.id
    and g.deleted_at is null and g.active and g.company_id is not null
    and coalesce(input->>'scope','all')<>'internal'
    and (input->>'company_id' is null or g.company_id=(input->>'company_id')::uuid)
    and (input->>'module' is null or g.module=input->>'module')
    and private.h07_visible(org,actor,g.company_id,g.module,'view',false))
  ))
 select jsonb_build_object('rows',coalesce(jsonb_agg(to_jsonb(candidates) order by name,user_id),'[]')) from candidates;
$$;

alter function public.h07_query(uuid,text,jsonb) set schema private;
alter function private.h07_query(uuid,text,jsonb) rename to h11_legacy_query;
revoke all on function private.h11_legacy_query(uuid,text,jsonb) from public,anon,authenticated;
create function public.h07_query(p_organization_id uuid,p_resource text,p_input jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare member public.organization_members; result jsonb;
begin
 member:=private.assert_member(p_organization_id,auth.uid());
 perform private.admit_session(p_organization_id);
 if p_resource not in ('documents','company_indicators','delivery_details','document_assistants','pending_deliveries') then
  return private.h11_legacy_query(p_organization_id,p_resource,p_input);
 end if;
 perform private.h11_validate(p_input);
 if coalesce((p_input->>'include_deleted')::boolean,false) and not member.is_admin then perform private.fail('FORBIDDEN'); end if;
 perform private.h11_assistant(p_organization_id,auth.uid(),p_input);
 result:=case p_resource
  when 'documents' then private.h11_documents(p_organization_id,auth.uid(),p_input)
  when 'company_indicators' then private.h11_company_indicators(p_organization_id,auth.uid(),p_input)
  when 'document_assistants' then private.h11_assistants(p_organization_id,auth.uid(),p_input)
  else private.h11_delivery_details(p_organization_id,auth.uid(),p_input) end;
 return jsonb_build_object('ok',true,'data',result);
exception when others then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',
 case when sqlstate='P0001' and sqlerrm in ('FORBIDDEN','NOT_FOUND','UNAUTHENTICATED') then sqlerrm else 'VALIDATION_ERROR' end));
end $$;
revoke all on function public.h07_query(uuid,text,jsonb) from public,anon;
grant execute on function public.h07_query(uuid,text,jsonb) to authenticated;
revoke all on function private.h11_legacy_filters(jsonb),private.h11_validate(jsonb),
 private.h11_assistant(uuid,uuid,jsonb),private.h11_facts(uuid,uuid,jsonb),
 private.h11_deliveries(uuid,uuid,jsonb),private.h11_company_indicators(uuid,uuid,jsonb),
 private.h11_delivery_details(uuid,uuid,jsonb),private.h11_documents(uuid,uuid,jsonb),private.h11_assistants(uuid,uuid,jsonb)
 from public,anon,authenticated;
create index h11_cycle_version_actor on public.document_versions(cycle_id,version_number,id) include(uploaded_by);
