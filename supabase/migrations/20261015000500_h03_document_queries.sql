create view public.h03_obligation_summary with (security_invoker=true) as
select o.id,o.organization_id,o.company_id,o.module,o.class,o.title,o.description,o.initial_due_date,o.delivery_responsible_id,o.assignment_issue,o.priority,o.is_required,o.disposition,o.disposition_reason,o.period_id,o.occurrence_key,o.revision,o.created_at,
  o.snapshot->'destination'->>'company_legal_name' as company_name,
  a.total_count,a.approved_count,a.observed_count,a.pending_count,a.operational_due_date,
  case when o.disposition<>'active' then o.disposition when a.approved_count=a.total_count and a.total_count>0 then 'aprobado'
    when a.observed_count>0 then 'observado' when a.pending_count>0 then 'pendiente' else 'por_revisar' end as aggregate_state,
  coalesce(a.operational_due_date<(now() at time zone 'America/Lima')::date,false) and o.disposition='active' as overdue
from public.obligations o cross join lateral (
  select count(*)::integer total_count,count(*) filter(where d.review_state='aprobado')::integer approved_count,
    count(*) filter(where d.review_state='observado')::integer observed_count,
    count(*) filter(where d.review_state='pendiente')::integer pending_count,
    (select min(c.due_date) from public.submission_cycles c join public.deliverables s on s.id=c.deliverable_id where s.obligation_id=o.id and c.state='open' and c.first_submitted_at is null) operational_due_date
  from public.deliverables d where d.obligation_id=o.id and d.organization_id=o.organization_id
) a;
revoke all on public.h03_obligation_summary from anon;
grant select on public.h03_obligation_summary to authenticated,service_role;

create function public.h03_query(p_organization_id uuid,p_resource text,p_input jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare member public.organization_members; result jsonb; obligation public.obligations;
  page_number integer := greatest(coalesce((p_input->>'page')::integer,1),1); start_at integer; total bigint; company_filter uuid := (p_input->>'company_id')::uuid;
begin
  member := private.assert_member(p_organization_id,auth.uid()); perform private.admit_session(p_organization_id);
  start_at := least(page_number-1,100000)*25;
  if p_resource='list' then
    with visible as (select s.* from public.h03_obligation_summary s join public.companies c on c.organization_id=s.organization_id and c.id=s.company_id
      where s.organization_id=p_organization_id and c.deleted_at is null and (company_filter is null or s.company_id=company_filter)
      and (member.is_admin or private.has_permission(p_organization_id,auth.uid(),s.company_id,s.module,'view'))
      and (coalesce(p_input->>'module','')='' or s.module=p_input->>'module')
      and (coalesce(p_input->>'q','')='' or position(lower(p_input->>'q') in lower(s.title))>0))
    select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from visible order by overdue desc,operational_due_date nulls last,id offset start_at limit 25) r),'[]'),'count',(select count(*) from visible)) into result;
  elsif p_resource='detail' then
    obligation := private.document_access(p_organization_id,(p_input->>'id')::uuid,auth.uid(),'view');
    result := jsonb_build_object('obligation',to_jsonb(obligation),'summary',(select to_jsonb(s) from public.h03_obligation_summary s where id=obligation.id),
      'deliverables',(select coalesce(jsonb_agg(to_jsonb(d) order by display_order),'[]') from public.deliverables d where obligation_id=obligation.id),
      'cycles',(select coalesce(jsonb_agg(to_jsonb(c)),'[]') from (select distinct on (deliverable_id) * from public.submission_cycles where deliverable_id in (select id from public.deliverables where obligation_id=obligation.id) order by deliverable_id,cycle_number desc) c),
      'intents',(select coalesce(jsonb_agg(to_jsonb(i)),'[]') from (select distinct on (deliverable_id) * from public.upload_intents where organization_id=p_organization_id and deliverable_id in (select id from public.deliverables where obligation_id=obligation.id) and user_id=auth.uid() and state in ('reserved','uploaded','validating') and expires_at>now() order by deliverable_id,created_at desc) i));
  elsif p_resource='history' then
    obligation := private.document_access(p_organization_id,(p_input->>'id')::uuid,auth.uid(),'view');
    select count(*) into total from public.document_versions where deliverable_id in (select id from public.deliverables where obligation_id=obligation.id);
    select jsonb_build_object('rows',coalesce(jsonb_agg(to_jsonb(v)||jsonb_build_object('uploader_name',(select full_name from public.profiles where user_id=v.uploaded_by),
      'label',(select label from public.deliverables where id=v.deliverable_id),'cycle',(select to_jsonb(c) from public.submission_cycles c where id=v.cycle_id),
      'reviews',(select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('reviewer_name',(select full_name from public.profiles where user_id=r.reviewer_id)) order by created_at),'[]') from public.review_events r where version_id=v.id)) order by v.finalized_at desc,v.id),'[]'),'count',total)
      into result from (select * from public.document_versions where deliverable_id in (select id from public.deliverables where obligation_id=obligation.id) order by finalized_at desc,id offset start_at limit 25) v;
  elsif p_resource='documents' then
    with visible as (select v.id,v.deliverable_id,v.original_name,v.extension,v.validated_bytes,v.finalized_at,v.version_number,o.id obligation_id,o.title,o.company_id,o.module,
        o.snapshot->'destination'->>'company_legal_name' company_name from public.document_versions v join public.deliverables d on d.id=v.deliverable_id join public.obligations o on o.id=d.obligation_id
        join public.companies c on c.id=o.company_id and c.deleted_at is null where v.organization_id=p_organization_id and (company_filter is null or o.company_id=company_filter)
        and (member.is_admin or private.has_permission(p_organization_id,auth.uid(),o.company_id,o.module,'view')))
      select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from visible order by finalized_at desc,id offset start_at limit 25) r),'[]'),'count',(select count(*) from visible)) into result;
  elsif p_resource in ('catalog','rules') then
    perform private.assert_member(p_organization_id,auth.uid(),true);
    if p_resource='catalog' then
      select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from public.document_types where organization_id=p_organization_id and (coalesce((p_input->>'include_deleted')::boolean,false) or deleted_at is null) order by name,id offset start_at limit 25) r),'[]'),
        'count',(select count(*) from public.document_types where organization_id=p_organization_id and (coalesce((p_input->>'include_deleted')::boolean,false) or deleted_at is null))) into result;
    else
      select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select r.*,c.legal_name company_name from public.requirement_rules r join public.companies c on c.id=r.company_id where r.organization_id=p_organization_id and c.deleted_at is null and (coalesce((p_input->>'include_deleted')::boolean,false) or r.deleted_at is null) order by r.created_at desc,r.id offset start_at limit 25) r),'[]'),
        'count',(select count(*) from public.requirement_rules r join public.companies c on c.id=r.company_id where r.organization_id=p_organization_id and c.deleted_at is null and (coalesce((p_input->>'include_deleted')::boolean,false) or r.deleted_at is null))) into result;
    end if;
  else perform private.fail('VALIDATION_ERROR');
  end if;
  return jsonb_build_object('ok',true,'data',result);
exception when raise_exception then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',sqlerrm));
end $$;
revoke all on function public.h03_query(uuid,text,jsonb) from public,anon;
grant execute on function public.h03_query(uuid,text,jsonb) to authenticated;

-- Historical rows cannot be rewritten by future maintenance accidentally.
create function private.keep_document_history() returns trigger language plpgsql set search_path='' as $$
begin perform private.fail('FORBIDDEN'); return null; end $$;
do $$ declare t text; begin
  foreach t in array array['rule_versions','periods','document_versions','review_events','notification_events'] loop
    execute format('create trigger immutable_history before update or delete on public.%I for each row execute function private.keep_document_history()',t);
  end loop;
end $$;
revoke all on function private.keep_document_history() from public,anon,authenticated;
