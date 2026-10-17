create function private.h04_audit(org uuid, actor uuid, req uuid, action_name text, resource text, resource_id uuid, before_data jsonb, after_data jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
  if actor is not null then perform private.audit(org,actor,req,action_name,resource,resource_id,before_data,after_data); return; end if;
  insert into public.audit_events(organization_id,actor_kind,system_actor,action,resource_table,resource_id,request_id,before_values,after_values,metadata)
    values(org,'system','h04-generation',action_name,resource,resource_id,req,private.safe_audit(before_data),private.safe_audit(after_data),
      '{"source":"cron","outcome":"completed","changed_fields":[]}');
end $$;

create function private.h04_assignment_event(obligation public.obligations, actor uuid, event_type text, event_key text) returns void
language plpgsql security definer set search_path='' as $$
declare v_event uuid; v_payload jsonb; v_recipient uuid;
begin
  v_payload:=jsonb_build_object('schema_version',1,'title',obligation.title,'body',case when event_type='assignment_issue' then 'Hay una incidencia de responsable. Revisa la asignación.' else 'Tienes una obligación asignada.' end,
    'target_path','/actividades/'||obligation.id,'priority',obligation.priority,'due_date',obligation.initial_due_date,
    'scope_label',obligation.snapshot->'destination'->>'company_legal_name');
  insert into public.notification_events(organization_id,event_key,event_type,company_id,module,obligation_id,payload,created_by)
    values(obligation.organization_id,event_key,event_type,obligation.company_id,obligation.module,obligation.id,v_payload,actor)
    on conflict(organization_id,event_key) do nothing returning id into v_event;
  if v_event is null then return; end if;
  for v_recipient in select m.user_id from public.organization_members m join public.profiles p on p.user_id=m.user_id
    where m.organization_id=obligation.organization_id and m.active and m.deleted_at is null and p.enabled and p.deleted_at is null and p.provisioning_status='ready'
      and (m.is_admin or (m.user_id=obligation.delivery_responsible_id and private.has_permission(m.organization_id,m.user_id,obligation.company_id,obligation.module,'view'))) loop
    insert into public.notifications(organization_id,recipient_id,event_id,title,body,target_path,created_by)
      values(obligation.organization_id,v_recipient,v_event,v_payload->>'title',v_payload->>'body',v_payload->>'target_path',actor) on conflict do nothing;
  end loop;
end $$;

create function private.h04_destinations(p_rule public.requirement_rules, p_config public.rule_versions, p_period jsonb,
  p_started_at timestamptz, p_event jsonb default null)
returns table(destination_key text,employment_period_id uuid,worker_id uuid,applicable boolean,exclusion_reason text)
language sql stable security definer set search_path='' as $$
  select 'company:'||p_rule.company_id,null::uuid,null::uuid,true,null::text where p_rule.module<>'laboral_trabajador'
  union all
  select 'employment_period:'||e.id,e.id,e.worker_id,
    jsonb_array_length(p_config.applicability_conditions->'termination_reasons')=0
      or (p_config.applicability_conditions->'termination_reasons') ? e.termination_reason,
    case when jsonb_array_length(p_config.applicability_conditions->'termination_reasons')>0
      and not coalesce((p_config.applicability_conditions->'termination_reasons') ? e.termination_reason,false) then 'El motivo de cese no cumple las condiciones de esta versión.' end
  from public.employment_periods e join public.workers w on w.organization_id=e.organization_id and w.id=e.worker_id
  where p_rule.module='laboral_trabajador' and e.organization_id=p_rule.organization_id and e.company_id=p_rule.company_id and w.deleted_at is null
    and e.created_at<=p_started_at and (p_rule.employment_period_id is null or e.id=p_rule.employment_period_id)
    and (p_event is null or p_event->>'employment_period_id' is null or e.id=(p_event->>'employment_period_id')::uuid)
    and case when p_event->>'event_type'='worker_hired' then e.start_date=(p_period->>'reference_date')::date
      when p_event->>'event_type'='worker_terminated' then e.end_date=(p_period->>'reference_date')::date
      else e.start_date<=(p_period->>'end_date')::date and (e.end_date is null or e.end_date>=(p_period->>'start_date')::date) end;
$$;

create function private.h04_emit(p_rule public.requirement_rules,p_config public.rule_versions,p_period jsonb,p_destination jsonb,p_actor uuid,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_period uuid; v_id uuid; v_slot uuid; v_spec jsonb; v_snapshot jsonb; v_responsible uuid; v_issue boolean; v_due date;
  v_company public.companies; v_applicable boolean:=coalesce((p_destination->>'applicable')::boolean,true);
begin
  select id into v_id from public.obligations where organization_id=p_rule.organization_id and rule_id=p_rule.id
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
    'module',p_rule.module,'title',p_config.configuration_snapshot->>'title','destination',jsonb_build_object('scope',case when p_destination->>'employment_period_id' is null then 'company' else 'employment_period' end,
      'company_id',p_rule.company_id,'company_legal_name',v_company.legal_name,'company_ruc',v_company.ruc,'employment_period_id',(p_destination->>'employment_period_id')::uuid,'worker_id',(p_destination->>'worker_id')::uuid),
    'recurrence',jsonb_build_object('frequency',p_config.frequency,'interval_count',p_config.interval_count,'interval_unit',p_config.interval_unit,'anchor_date',p_config.anchor_date,'deadline_offset_days',p_config.deadline_offset_days),
    'occurrence',jsonb_build_object('destination_key',p_destination->>'destination_key','occurrence_key',p_period->>'key','period_id',v_period,'period_start',p_period->>'start_date','period_end',p_period->>'end_date'),
    'initial_due_date',v_due,'is_required',p_config.is_required,'initial_priority',p_config.priority,'initial_responsible_id',v_responsible,
    'allowed_formats',to_jsonb(p_config.allowed_formats),'max_file_bytes',p_config.max_file_bytes,'deliverables',p_config.deliverable_specs,'applicability_conditions',p_config.applicability_conditions);
  insert into public.obligations(organization_id,class,company_id,employment_period_id,module,period_id,rule_id,rule_version_id,document_type_id,destination_key,occurrence_key,title,description,
    initial_due_date,delivery_responsible_id,assignment_issue,priority,is_required,snapshot,disposition,disposition_reason,created_by,updated_by)
    values(p_rule.organization_id,p_rule.class,p_rule.company_id,(p_destination->>'employment_period_id')::uuid,p_rule.module,v_period,p_rule.id,p_config.id,p_rule.document_type_id,
      p_destination->>'destination_key',p_period->>'key',p_config.configuration_snapshot->>'title',p_config.configuration_snapshot->>'description',v_due,v_responsible,v_issue,p_config.priority,p_config.is_required,v_snapshot,
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

create function private.h04_period_excluded(p_pauses jsonb,p_reference date,p_end date) returns boolean
language sql immutable set search_path='' as $$
  select exists(select 1 from jsonb_array_elements(coalesce(p_pauses,'[]')) p where (p->>'paused_from')::date<=p_reference
    and (p->>'resumed_on' is null or p_end<(p->>'resumed_on')::date));
$$;

create function private.h04_generate(p_rule_id uuid,p_actor uuid,p_request uuid,p_today date,p_limit integer default 50,p_event jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_rule public.requirement_rules; v_config public.rule_versions; v_company public.companies; v_org public.organizations;
  v_cursor jsonb; v_reference date; v_period jsonb; v_destination record; v_after text; v_started timestamptz;
  v_processed integer:=0; v_generated integer:=0; v_cycles integer:=0; v_more boolean:=false; v_changed boolean:=false;
  v_existing uuid; v_first uuid; v_id uuid; v_pending boolean; v_warning text;
begin
  if p_limit not between 1 and 100 or p_today is null then perform private.fail('VALIDATION_ERROR'); end if;
  select * into v_rule from public.requirement_rules where id=p_rule_id for update;
  select * into v_org from public.organizations where id=v_rule.organization_id;
  select * into v_company from public.companies where organization_id=v_rule.organization_id and id=v_rule.company_id;
  if v_rule.id is null then perform private.fail('NOT_FOUND'); end if;
  if not v_rule.active or v_rule.deleted_at is not null or v_org.deleted_at is not null or v_org.status<>'active'
    or v_company.deleted_at is not null or v_company.status<>'active'
    or not exists(select 1 from public.document_types where organization_id=v_rule.organization_id and id=v_rule.document_type_id and active and deleted_at is null)
    then perform private.fail('FORBIDDEN'); end if;
  v_cursor:=v_rule.generation_cursor;
  v_reference:=greatest(v_rule.control_start_date,v_company.control_start_date,coalesce((v_cursor->>'last_completed_end')::date+1,v_rule.control_start_date));
  if v_cursor->>'processing_reference_date' is not null then v_reference:=(v_cursor->>'processing_reference_date')::date; end if;
  if p_event is not null then v_reference:=(p_event->>'reference_date')::date; end if;
  while v_reference<=p_today and v_processed<p_limit and v_cycles<100 loop
    v_cycles:=v_cycles+1;
    if v_cursor->>'processing_occurrence' is not null and p_event is null then
      select * into v_config from public.rule_versions where organization_id=v_rule.organization_id and rule_id=v_rule.id and id=(v_cursor->>'rule_version_id')::uuid;
    else
      select * into v_config from public.rule_versions where organization_id=v_rule.organization_id and rule_id=v_rule.id and effective_from<=v_reference order by effective_from desc,version_number desc limit 1;
    end if;
    if v_config.id is null then exit; end if;
    if v_config.frequency='eventual' and p_event is null then exit; end if;
    if v_config.frequency<>'eventual' and p_event is not null then perform private.fail('VALIDATION_ERROR'); end if;
    if v_config.frequency='unica' and v_cursor->>'last_completed_occurrence' is not null then exit; end if;
    if v_config.frequency='personalizada' and v_reference<v_config.anchor_date then v_reference:=v_config.anchor_date; if v_reference>p_today then exit; end if; end if;
    if p_event is not null and (v_reference<greatest(v_rule.control_start_date,v_company.control_start_date)
      or not (v_config.applicability_conditions->'event_types') ? (p_event->>'event_type')) then perform private.fail('VALIDATION_ERROR'); end if;
    v_period:=private.h04_calendar(v_config.frequency,v_reference,v_config.anchor_date,v_config.interval_count,v_config.interval_unit,
      v_rule.id::text||case when p_event is not null then ':'||(p_event->>'event_id') else '' end);
    if private.h04_period_excluded(v_rule.operation_pauses,v_reference,(v_period->>'end_date')::date)
      or private.h04_period_excluded(v_company.operation_pauses,v_reference,(v_period->>'end_date')::date)
      or private.h04_period_excluded(v_org.operation_pauses,v_reference,(v_period->>'end_date')::date)
      or private.h04_period_excluded(v_cursor->'type_pauses',v_reference,(v_period->>'end_date')::date) then
      v_cursor:=v_cursor||jsonb_build_object('last_completed_occurrence',v_period->>'key','last_completed_end',v_period->>'end_date',
        'processing_occurrence',null,'processing_reference_date',null,'next_destination_key',null,'processing_started_at',null);
      v_changed:=true; v_reference:=(v_period->>'end_date')::date+1; continue;
    end if;
    v_after:=case when p_event is null then v_cursor->>'next_destination_key' end;
    v_started:=coalesce((v_cursor->>'processing_started_at')::timestamptz,now());
    v_more:=false;
    for v_destination in select * from private.h04_destinations(v_rule,v_config,v_period,v_started,p_event)
      where v_after is null or destination_key>v_after order by destination_key limit p_limit-v_processed+1 loop
      if v_processed>=p_limit then v_more:=true; exit; end if;
      select id into v_existing from public.obligations where organization_id=v_rule.organization_id and rule_id=v_rule.id and destination_key=v_destination.destination_key and occurrence_key=v_period->>'key';
      v_id:=private.h04_emit(v_rule,v_config,v_period,to_jsonb(v_destination),p_actor,p_request);
      v_first:=coalesce(v_first,v_id); v_after:=v_destination.destination_key;
      v_processed:=v_processed+1; if v_existing is null then v_generated:=v_generated+1; end if;
      if (v_period->>'end_date')::date+v_config.deadline_offset_days<p_today then v_warning:='El plazo original ya venció; se conserva sin ajustes.'; end if;
    end loop;
    v_changed:=true;
    if p_event is not null then exit; end if;
    v_cursor:=v_cursor||jsonb_build_object('rule_version_id',v_config.id,'last_generated_at',now(),
      'processing_occurrence',case when v_more then v_period->>'key' end,'processing_reference_date',case when v_more then v_reference end,
      'next_destination_key',case when v_more then v_after end,'processing_started_at',case when v_more then v_started end);
    if v_more then exit; end if;
    v_cursor:=v_cursor||jsonb_build_object('last_completed_occurrence',v_period->>'key','last_completed_end',v_period->>'end_date');
    if v_config.frequency='unica' then exit; end if;
    v_reference:=(v_period->>'end_date')::date+1;
  end loop;
  v_pending:=p_event is null and (v_more or (v_reference<=p_today and v_config.frequency not in ('unica','eventual')));
  if v_changed and p_event is null then
    update public.requirement_rules set generation_cursor=v_cursor||jsonb_build_object('last_attempt_at',now(),'last_error',null,'last_batch_count',v_generated,
      'has_more',v_pending,'warning',v_warning),revision=revision+1,updated_at=now(),updated_by=p_actor where id=v_rule.id;
  elsif p_event is null then
    update public.requirement_rules set generation_cursor=generation_cursor||jsonb_build_object('last_attempt_at',now(),'last_error',null,'has_more',false,'last_batch_count',0) where id=v_rule.id;
  end if;
  if v_first is null then
    select id into v_first from public.obligations where organization_id=v_rule.organization_id and rule_id=v_rule.id
      and occurrence_key=coalesce(v_period->>'key',v_cursor->>'last_completed_occurrence') order by destination_key limit 1;
  end if;
  return jsonb_build_object('schema_version',1,'resource_id',coalesce(v_first,v_rule.id),'obligation_id',v_first,
    'revision',(select revision from public.requirement_rules where id=v_rule.id),'status',case when v_pending then 'pending' else 'completed' end,
    'generated_count',v_generated,'processed_count',v_processed,'has_more',coalesce(v_pending,false),'warning',v_warning);
end $$;
