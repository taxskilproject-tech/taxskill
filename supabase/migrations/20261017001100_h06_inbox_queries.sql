create function private.h06_inbox(p_org uuid,p_actor uuid,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_result jsonb; v_today date:=(now() at time zone 'America/Lima')::date; v_days integer; v_group text:=coalesce(p_input->>'group','mine');
  v_sort text:=coalesce(p_input->>'sort','urgency'); v_size integer:=coalesce((p_input->>'pageSize')::integer,25); v_page integer:=coalesce((p_input->>'page')::integer,1);
begin
  if v_size not in (25,50,100) or v_page not between 1 and 100000 or v_group not in ('mine','review','overdue','upcoming','observed','all')
    or v_sort not in ('urgency','priority','due_date','received_at') or coalesce(p_input->>'scope','all') not in ('all','company','internal')
    or (p_input->>'module' is not null and p_input->>'module' not in ('tributario','laboral_trabajador','laboral_general','actividades'))
    or (p_input->>'class' is not null and p_input->>'class' not in ('documentary','additional'))
    or (p_input->>'priority' is not null and p_input->>'priority' not in ('alta','media','baja'))
    or (p_input->>'state' is not null and p_input->>'state' not in ('pendiente','por_revisar','observado','aprobado','no_aplica','cancelled')) then perform private.fail('VALIDATION_ERROR'); end if;
  select (settings->>'upcoming_days')::integer into v_days from public.organizations where id=p_org;
  with base as (
    select s.*,coalesce(s.company_name,'Interna del estudio') scope_label,
      (s.delivery_responsible_id is null or not private.has_permission(p_org,s.delivery_responsible_id,s.company_id,s.module,'upload')) current_assignment_issue,
      exists(select 1 from public.deliverables d where d.obligation_id=s.id and d.review_state='por_revisar') and
        (private.has_permission(p_org,p_actor,s.company_id,s.module,'approve') or private.has_permission(p_org,p_actor,s.company_id,s.module,'observe')) can_review,
      (select min(c.first_submitted_at) from public.submission_cycles c join public.deliverables d on d.id=c.deliverable_id where d.obligation_id=s.id and d.review_state='por_revisar') oldest_received_at,
      case when s.disposition<>'active' then 4 when s.operational_due_date<v_today then 0 when s.operational_due_date<=v_today+v_days then 1 when s.operational_due_date is not null then 2 when s.aggregate_state='por_revisar' then 3 else 4 end urgency_rank,
      case s.priority when 'alta' then 0 when 'media' then 1 else 2 end priority_rank
    from public.h03_obligation_summary s where s.organization_id=p_org and private.h06_visible(p_org,p_actor,s.company_id,s.module)
      and (p_input->>'company_id' is null or s.company_id=(p_input->>'company_id')::uuid)
      and (coalesce(p_input->>'scope','all')<>'internal' or s.company_id is null) and (coalesce(p_input->>'scope','all')<>'company' or s.company_id is not null)
      and (p_input->>'module' is null or s.module=p_input->>'module') and (p_input->>'class' is null or s.class=p_input->>'class')
      and (p_input->>'responsible_id' is null or s.delivery_responsible_id=(p_input->>'responsible_id')::uuid)
      and (p_input->>'priority' is null or s.priority=p_input->>'priority') and (p_input->>'period' is null or s.occurrence_key=p_input->>'period')
      and (p_input->>'state' is null or s.aggregate_state=p_input->>'state')
      and (p_input->>'due_from' is null or s.operational_due_date>=(p_input->>'due_from')::date) and (p_input->>'due_to' is null or s.operational_due_date<=(p_input->>'due_to')::date)
      and (coalesce(p_input->>'q','')='' or position(lower(p_input->>'q') in lower(concat_ws(' ',s.title,s.description,s.company_name,s.worker_name,
        (select concat_ws(' ',d.name,d.code,d.category) from public.obligations o join public.document_types d on d.id=o.document_type_id where o.id=s.id))))>0)
  ), grouped as(select * from base where v_group='all' or v_group='mine' and delivery_responsible_id=p_actor or v_group='review' and disposition='active' and can_review
    or v_group='overdue' and overdue or v_group='upcoming' and disposition='active' and operational_due_date between v_today and v_today+v_days
    or v_group='observed' and disposition='active' and observed_count>0), paged as(
      select to_jsonb(g)||jsonb_build_object('assignment_issue',current_assignment_issue) row_data from grouped g order by
        case when v_sort='urgency' then urgency_rank end,
        case when v_sort in ('urgency','priority') then priority_rank end,
        case when v_sort='received_at' or v_group='review' and v_sort='urgency' then oldest_received_at end nulls last,
        operational_due_date nulls last,id offset (v_page-1)*v_size limit v_size)
  select jsonb_build_object('rows',coalesce((select jsonb_agg(row_data) from paged),'[]'),'count',(select count(*) from grouped),
    'groups',(select jsonb_build_object('all',count(*),'mine',count(*) filter(where delivery_responsible_id=p_actor),'review',count(*) filter(where can_review and disposition='active'),
      'overdue',count(*) filter(where overdue),'upcoming',count(*) filter(where disposition='active' and operational_due_date between v_today and v_today+v_days),'observed',count(*) filter(where disposition='active' and observed_count>0)) from base),
    'indicators',(select jsonb_build_object('documentary',jsonb_build_object('required',count(*) filter(where class='documentary' and disposition='active' and is_required),'approved',count(*) filter(where class='documentary' and disposition='active' and is_required and aggregate_state='aprobado')),
      'additional',jsonb_build_object('required',count(*) filter(where class='additional' and disposition='active' and is_required),'approved',count(*) filter(where class='additional' and disposition='active' and is_required and aggregate_state='aprobado'))) from base)) into v_result;
  return v_result;
end $$;

create function public.h06_query(p_organization_id uuid,p_resource text,p_input jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_member public.organization_members; v_result jsonb; v_page integer:=coalesce((p_input->>'page')::integer,1); v_size integer:=coalesce((p_input->>'pageSize')::integer,25);
begin
  v_member:=private.assert_member(p_organization_id,auth.uid()); perform private.admit_session(p_organization_id);
  if v_size not in (25,50,100) or v_page not between 1 and 100000 then perform private.fail('VALIDATION_ERROR'); end if;
  if p_resource='activities' then v_result:=private.h06_inbox(p_organization_id,auth.uid(),p_input);
  elsif p_resource='notifications' then
    with visible as(select n.*,e.event_type,e.obligation_id,e.company_id from public.notifications n join public.notification_events e on e.organization_id=n.organization_id and e.id=n.event_id
      where n.organization_id=p_organization_id and n.recipient_id=auth.uid()
        and (e.obligation_id is null and v_member.is_admin or e.obligation_id is not null and private.h06_visible(p_organization_id,auth.uid(),e.company_id,e.module))
        and (p_input->>'company_id' is null or e.company_id=(p_input->>'company_id')::uuid)
        and (coalesce(p_input->>'scope','all')<>'internal' or e.company_id is null)), filtered as(select * from visible where not coalesce((p_input->>'unread_only')::boolean,false) or read_at is null)
    select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from filtered order by created_at desc,id offset (v_page-1)*v_size limit v_size) r),'[]'),
      'count',(select count(*) from filtered),'unread_count',(select count(*) from visible where read_at is null)) into v_result;
  elsif p_resource='additional_rules' then
    perform private.assert_member(p_organization_id,auth.uid(),true);
    with visible as(select r.*,to_jsonb(v) configuration from public.requirement_rules r join public.rule_versions v on v.id=r.current_version_id
      where r.organization_id=p_organization_id and r.class='additional' and r.deleted_at is null and (r.company_id is null or exists(select 1 from public.companies c where c.id=r.company_id and c.deleted_at is null))
        and (p_input->>'company_id' is null or r.company_id=(p_input->>'company_id')::uuid))
    select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from visible order by created_at desc,id offset (v_page-1)*v_size limit v_size) r),'[]'),'count',(select count(*) from visible)) into v_result;
  elsif p_resource='recipients' then
    perform private.assert_member(p_organization_id,auth.uid(),true);
    with eligible as(select p.user_id,p.full_name from public.profiles p where private.has_permission(p_organization_id,p.user_id,(p_input->>'company_id')::uuid,'actividades','upload'))
    select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from eligible order by full_name,user_id offset (v_page-1)*v_size limit v_size) r),'[]'),'count',(select count(*) from eligible)) into v_result;
  else perform private.fail('VALIDATION_ERROR'); end if;
  return jsonb_build_object('ok',true,'data',v_result);
exception when raise_exception then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',sqlerrm));
  when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then return jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR'));
end $$;
revoke all on function private.h06_inbox(uuid,uuid,jsonb),public.h06_query(uuid,text,jsonb) from public,anon;
revoke all on function private.h06_inbox(uuid,uuid,jsonb) from authenticated;
grant execute on function public.h06_query(uuid,text,jsonb) to authenticated;
