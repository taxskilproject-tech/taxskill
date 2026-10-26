-- Read-only tax workspace. Period membership uses civil period dates, never due dates.
create view private.tax_obligation_rows with (security_invoker=true) as
select s.*,o.document_type_id,t.code document_code,t.name document_name,
  p.kind period_kind,p.start_date period_start,p.end_date period_end,
  coalesce(array_position(array['tributario_calculo','tributario_pdt','tributario_compras','tributario_ventas',
    'tributario_control','tributario_consulta_pdt','tributario_consulta_pagos'],t.code),100) document_order
from public.h03_obligation_summary s
join public.obligations o on o.organization_id=s.organization_id and o.id=s.id
join public.periods p on p.organization_id=o.organization_id and p.id=o.period_id
join public.document_types t on t.organization_id=o.organization_id and t.id=o.document_type_id
join public.companies c on c.organization_id=o.organization_id and c.id=o.company_id
where o.module='tributario' and o.class='documentary' and c.deleted_at is null and c.status='active';
revoke all on private.tax_obligation_rows from public,anon,authenticated;

create function private.tax_workspace_query(org uuid,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  member public.organization_members;
  company uuid;
  yr integer;
  mn integer;
  page_number integer;
  code text:=nullif(input->>'tax_code','');
  state_filter text:=coalesce(input->>'state','');
  first_day date; next_month date; result jsonb;
begin
  member:=private.assert_member(org,auth.uid());
  perform private.admit_session(org);
  company:=(input->>'company_id')::uuid;
  yr:=(input->>'year')::integer;
  mn:=(input->>'month')::integer;
  page_number:=coalesce((input->>'page')::integer,1);
  if company is null or yr is null or yr not between 1 and 9998 or
    (mn is not null and mn not between 1 and 12) or page_number not between 1 and 1000000 or
    length(code)>60 or (state_filter<>'' and state_filter not in ('pendiente','por_revisar','observado','aprobado','no_aplica','cancelled')) then
    perform private.fail('VALIDATION_ERROR');
  end if;
  if not exists(select 1 from public.companies c where c.organization_id=org and c.id=company and c.deleted_at is null and c.status='active') then
    perform private.fail('NOT_FOUND');
  end if;
  if not member.is_admin and not private.has_permission(org,auth.uid(),company,'tributario','view') then
    perform private.fail('FORBIDDEN');
  end if;
  if mn is not null then
    first_day:=make_date(yr,mn,1); next_month:=(first_day+interval '1 month')::date;
    if code is null then
      select r.document_code into code from private.tax_obligation_rows r
      where r.organization_id=org and r.company_id=company and r.period_start<next_month and r.period_end>=first_day
      order by r.document_order,r.document_name,r.document_code limit 1;
    end if;
  end if;
  with visible as materialized (
    select r.* from private.tax_obligation_rows r where r.organization_id=org and r.company_id=company
  ), in_month as materialized (
    select * from visible where mn is not null and period_start<next_month and period_end>=first_day
  ), selected as materialized (
    select * from in_month where document_code=code and (state_filter='' or aggregate_state=state_filter)
  ), years as (
    select yr value union select extract(year from now() at time zone 'America/Lima')::integer
    union select distinct generate_series(extract(year from period_start)::integer,extract(year from period_end)::integer) from visible
  ), page_rows as (
    select * from selected order by period_start,period_end,title,id offset (page_number-1)*25 limit 25
  )
  select jsonb_build_object(
    'years',(select jsonb_agg(value order by value desc) from years),
    'months',(select jsonb_agg(jsonb_build_object('month',n,'count',
      (select count(*) from visible where period_start<(make_date(yr,n,1)+interval '1 month')::date and period_end>=make_date(yr,n,1))) order by n) from generate_series(1,12) n),
    'groups',coalesce((select jsonb_agg(to_jsonb(g) order by g.document_order,g.name,g.code) from (
      select document_code code,document_name name,document_order,count(*) count,
        sum(total_count) total_files,sum(approved_count) approved_files
      from in_month group by document_code,document_name,document_order) g),'[]'::jsonb),
    'selected_code',code,
    'rows',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('files',
      (select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'label',d.label,'display_order',d.display_order,'review_state',d.review_state,
        'due_date',(select c.due_date from public.submission_cycles c where c.organization_id=org and c.deliverable_id=d.id order by c.cycle_number desc limit 1),
        'formats',coalesce((select spec->'allowed_formats' from jsonb_array_elements(o.snapshot->'deliverables') spec where spec->>'position_code'=d.position_code),'[]'::jsonb))
        order by d.display_order,d.id),'[]'::jsonb) from public.deliverables d join public.obligations o on o.id=d.obligation_id and o.organization_id=org
        where d.organization_id=org and d.obligation_id=r.id)) order by r.period_start,r.period_end,r.title,r.id) from page_rows r),'[]'::jsonb),
    'count',(select count(*) from selected)
  ) into result;
  return jsonb_build_object('ok',true,'data',result);
exception
  when raise_exception then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',sqlerrm));
  when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow then
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR'));
end $$;
revoke all on function private.tax_workspace_query(uuid,jsonb) from public,anon,authenticated;

-- Keep all legacy resources and the public upload-token sanitization wrapper unchanged.
alter function private.h08_document_query(uuid,text,jsonb) rename to tax_document_query_legacy;
revoke all on function private.tax_document_query_legacy(uuid,text,jsonb) from public,anon,authenticated;
create function private.h08_document_query(p_organization_id uuid,p_resource text,p_input jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if p_resource='tax' then return private.tax_workspace_query(p_organization_id,p_input); end if;
  return private.tax_document_query_legacy(p_organization_id,p_resource,p_input);
end $$;
revoke all on function private.h08_document_query(uuid,text,jsonb) from public,anon,authenticated;
