create or replace function private.h04_emit(p_rule public.requirement_rules,p_config public.rule_versions,p_period jsonb,p_destination jsonb,p_actor uuid,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_period uuid; v_id uuid; v_slot uuid; v_spec jsonb; v_snapshot jsonb; v_responsible uuid; v_issue boolean; v_due date;
  v_company public.companies; v_applicable boolean:=coalesce((p_destination->>'applicable')::boolean,true);
begin
  select id into v_id from public.obligations where organization_id=p_rule.organization_id and ((p_rule.id is null and manual_request_id=p_request) or rule_id=p_rule.id)
    and destination_key=p_destination->>'destination_key' and occurrence_key=p_period->>'key';
  if v_id is not null then return v_id; end if;
  select * into v_company from public.companies where id=p_rule.company_id and organization_id=p_rule.organization_id;
  v_responsible:=(p_config.configuration_snapshot->>'delivery_responsible_id')::uuid;
  if (p_config.configuration_snapshot->>'inherit_responsible')::boolean then
    select delivery_responsible_id into v_responsible from public.company_module_settings where organization_id=p_rule.organization_id
      and company_id=p_rule.company_id and module=p_rule.module and deleted_at is null;
  end if;
  v_issue:=v_responsible is null or not private.has_permission(p_rule.organization_id,v_responsible,p_rule.company_id,p_rule.module,'upload');
  v_due:=(p_period->>'end_date')::date+p_config.deadline_offset_days;
  insert into public.periods(organization_id,kind,period_key,start_date,end_date,reference_date,created_by)
    values(p_rule.organization_id,p_period->>'kind',p_period->>'key',(p_period->>'start_date')::date,(p_period->>'end_date')::date,(p_period->>'reference_date')::date,p_actor)
    on conflict(organization_id,kind,period_key) do nothing;
  select id into v_period from public.periods where organization_id=p_rule.organization_id and kind=p_period->>'kind' and period_key=p_period->>'key';
  v_snapshot:=jsonb_build_object('schema_version',1,'source',jsonb_build_object('rule_id',p_rule.id,'rule_version_id',p_config.id,'document_type_id',p_rule.document_type_id,'version_number',p_config.version_number,'class',p_rule.class),
    'module',p_rule.module,'title',p_config.configuration_snapshot->>'title','destination',jsonb_build_object('scope',case when p_rule.company_id is null then 'organization' when p_destination->>'employment_period_id' is null then 'company' else 'employment_period' end,
      'company_id',p_rule.company_id,'company_legal_name',v_company.legal_name,'company_ruc',v_company.ruc,'employment_period_id',(p_destination->>'employment_period_id')::uuid,'worker_id',(p_destination->>'worker_id')::uuid),
    'recurrence',jsonb_build_object('frequency',p_config.frequency,'interval_count',p_config.interval_count,'interval_unit',p_config.interval_unit,'anchor_date',p_config.anchor_date,'deadline_offset_days',p_config.deadline_offset_days),
    'occurrence',jsonb_build_object('destination_key',p_destination->>'destination_key','occurrence_key',p_period->>'key','period_id',v_period,'period_start',p_period->>'start_date','period_end',p_period->>'end_date'),
    'initial_due_date',v_due,'is_required',p_config.is_required,'initial_priority',p_config.priority,'initial_responsible_id',v_responsible,
    'allowed_formats',to_jsonb(p_config.allowed_formats),'max_file_bytes',p_config.max_file_bytes,'deliverables',p_config.deliverable_specs,'applicability_conditions',p_config.applicability_conditions);
  if p_period ? 'employment_event' then v_snapshot:=v_snapshot||jsonb_build_object('employment_event',p_period->'employment_event'); end if;
  insert into public.obligations(organization_id,class,company_id,employment_period_id,module,period_id,rule_id,rule_version_id,document_type_id,destination_key,occurrence_key,manual_request_id,title,description,
    initial_due_date,delivery_responsible_id,assignment_issue,priority,is_required,snapshot,disposition,disposition_reason,created_by,updated_by)
    values(p_rule.organization_id,p_rule.class,p_rule.company_id,(p_destination->>'employment_period_id')::uuid,p_rule.module,v_period,p_rule.id,p_config.id,p_rule.document_type_id,
      p_destination->>'destination_key',p_period->>'key',case when p_rule.id is null then p_request end,p_config.configuration_snapshot->>'title',p_config.configuration_snapshot->>'description',v_due,v_responsible,v_issue,p_config.priority,p_config.is_required,v_snapshot,
      case when v_applicable then 'active' else 'no_aplica' end,case when not v_applicable then p_destination->>'exclusion_reason' end,p_actor,p_actor) returning id into v_id;
  for v_spec in select value from jsonb_array_elements(p_config.deliverable_specs) loop
    insert into public.deliverables(organization_id,obligation_id,position_code,label,display_order,created_by,updated_by)
      values(p_rule.organization_id,v_id,v_spec->>'position_code',v_spec->>'label',(v_spec->>'display_order')::integer,p_actor,p_actor) returning id into v_slot;
    insert into public.submission_cycles(organization_id,deliverable_id,cycle_number,reason,due_date,state,closed_at,created_by,updated_by)
      values(p_rule.organization_id,v_slot,1,'initial',v_due,case when v_applicable then 'open' else 'cancelled' end,case when not v_applicable then now() end,p_actor,p_actor);
  end loop;
  perform private.h04_audit(p_rule.organization_id,p_actor,p_request,'GenerateRequirement','obligations',v_id,null,jsonb_build_object('title',v_snapshot->>'title','priority',p_config.priority));
  if v_applicable then
    if v_issue then perform private.h04_assignment_event((select o from public.obligations o where id=v_id),p_actor,'assignment_issue','assignment_issue:'||v_id||':initial');
    else perform private.document_event((select o from public.obligations o where id=v_id),p_actor,'assigned','assigned:'||v_id); end if;
  end if;
  return v_id;
end $$;

alter function public.h06_query(uuid,text,jsonb) rename to h06_query_admin;
alter function public.h06_query_admin(uuid,text,jsonb) set schema private;
create function public.h06_query(p_organization_id uuid,p_resource text,p_input jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_result jsonb; v_page integer:=coalesce((p_input->>'page')::integer,1); v_size integer:=coalesce((p_input->>'pageSize')::integer,25);
begin
  if p_resource='unread_count' then
    v_result:=private.h06_query_admin(p_organization_id,'notifications',p_input);
    if not coalesce((v_result->>'ok')::boolean,false) then return v_result; end if;
    return jsonb_build_object('ok',true,'data',jsonb_build_object('unread_count',v_result->'data'->'unread_count'));
  end if;
  if p_resource not in ('activity_responsibles','additional_rules') then return private.h06_query_admin(p_organization_id,p_resource,p_input); end if;
  perform private.assert_member(p_organization_id,auth.uid()); perform private.admit_session(p_organization_id);
  if v_size not in (25,50,100) or v_page not between 1 and 100000 then perform private.fail('VALIDATION_ERROR'); end if;
  if p_resource='activity_responsibles' then
    with visible as(select distinct p.user_id,p.full_name from public.obligations o join public.profiles p on p.user_id=o.delivery_responsible_id
      where o.organization_id=p_organization_id and private.h06_visible(p_organization_id,auth.uid(),o.company_id,o.module)
        and (p_input->>'company_id' is null or o.company_id=(p_input->>'company_id')::uuid) and (coalesce(p_input->>'scope','all')<>'internal' or o.company_id is null))
    select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from visible order by full_name,user_id offset (v_page-1)*v_size limit v_size) r),'[]'),'count',(select count(*) from visible)) into v_result;
  else
    perform private.assert_member(p_organization_id,auth.uid(),true);
    with visible as(select r.*,to_jsonb(v) configuration from public.requirement_rules r join public.rule_versions v on v.id=r.current_version_id
      where r.organization_id=p_organization_id and r.class='additional' and (coalesce((p_input->>'include_deleted')::boolean,false) or r.deleted_at is null)
        and (r.company_id is null or exists(select 1 from public.companies c where c.id=r.company_id and c.deleted_at is null))
        and (p_input->>'company_id' is null or r.company_id=(p_input->>'company_id')::uuid) and (coalesce(p_input->>'scope','all')<>'internal' or r.company_id is null))
    select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from visible order by created_at desc,id offset (v_page-1)*v_size limit v_size) r),'[]'),'count',(select count(*) from visible)) into v_result;
  end if;
  return jsonb_build_object('ok',true,'data',v_result);
exception when raise_exception then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',sqlerrm));
  when invalid_text_representation then return jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR'));
end $$;
revoke all on function private.h06_query_admin(uuid,text,jsonb),public.h06_query(uuid,text,jsonb) from public,anon;
revoke all on function private.h06_query_admin(uuid,text,jsonb) from authenticated;
grant execute on function public.h06_query(uuid,text,jsonb) to authenticated;
