-- H05 adapts employment events to the shared H04 calendar/emitter, with bounded durable progress.
create function private.h05_process_employment(p_id uuid,p_actor uuid,p_request uuid,p_limit integer default 25) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_stage public.employment_periods; v_worker public.workers; v_company public.companies; v_rule public.requirement_rules; v_config public.rule_versions;
  v_phase text; v_event jsonb; v_calendar jsonb; v_destination jsonb; v_state jsonb; v_day date; v_count integer:=0; v_new integer:=0; v_phase_new integer:=0; v_more boolean;
  v_existing uuid; v_obligation uuid; v_applicable boolean; v_cursor text; v_today date:=(now() at time zone 'America/Lima')::date;
begin
  if p_limit not between 1 and 100 then perform private.fail('VALIDATION_ERROR'); end if;
  select * into v_stage from public.employment_periods where id=p_id for update;
  select * into v_worker from public.workers where id=v_stage.worker_id and organization_id=v_stage.organization_id;
  select * into v_company from public.companies where id=v_stage.company_id and organization_id=v_stage.organization_id;
  if v_worker.id is null or v_worker.deleted_at is not null or v_company.deleted_at is not null or v_company.status<>'active' then perform private.fail('FORBIDDEN'); end if;
  v_state:=v_stage.document_generation;
  foreach v_phase in array array['hire','termination','reconcile'] loop
    v_event:=v_state->v_phase;
    if v_event is null or v_event='null'::jsonb or v_event->>'status' not in ('pending','failed') then continue; end if;
    v_day:=(v_event->>'reference_date')::date;
    if v_day>v_today then continue; end if;
    v_cursor:=v_event->>'last_rule_id'; v_more:=false; v_phase_new:=0;
    begin
      for v_rule in select r.* from public.requirement_rules r join public.document_types d on d.organization_id=r.organization_id and d.id=r.document_type_id
        where r.organization_id=v_stage.organization_id and r.company_id=v_stage.company_id and r.module='laboral_trabajador' and r.active and r.deleted_at is null and d.active and d.deleted_at is null
          and (r.employment_period_id is null or r.employment_period_id=v_stage.id) and r.created_at<=(v_event->>'requested_at')::timestamptz
          and (v_cursor is null or r.id::text>v_cursor) order by r.id limit p_limit-v_count+1 loop
        if v_count>=p_limit then v_more:=true; exit; end if;
        select * into v_config from public.rule_versions where organization_id=v_rule.organization_id and rule_id=v_rule.id and effective_from<=v_day order by effective_from desc,version_number desc limit 1;
        if v_config.id is not null and v_rule.control_start_date<=v_day then
          if v_config.frequency='eventual' and v_phase<>'reconcile' and v_config.applicability_conditions->'event_types' ? (v_event->>'event_type') then
            v_calendar:=private.h04_calendar('eventual',v_day,null,null,null,v_rule.id||':'||(v_event->>'event_id'));
          elsif v_config.frequency<>'eventual' and v_phase in ('hire','reconcile') then
            if v_config.frequency='personalizada' and v_config.anchor_date>v_day then v_calendar:=null;
            else v_calendar:=private.h04_calendar(v_config.frequency,v_day,v_config.anchor_date,v_config.interval_count,v_config.interval_unit,v_rule.id::text); end if;
            if v_calendar is not null and (v_stage.start_date>(v_calendar->>'end_date')::date or v_stage.end_date<(v_calendar->>'start_date')::date) then v_calendar:=null; end if;
          else v_calendar:=null; end if;
          if v_calendar is not null and not private.h04_period_excluded(v_rule.operation_pauses,v_day,(v_calendar->>'end_date')::date)
            and not private.h04_period_excluded(v_company.operation_pauses,v_day,(v_calendar->>'end_date')::date)
            and not private.h04_period_excluded(v_worker.operation_pauses,v_day,(v_calendar->>'end_date')::date)
            and not private.h04_period_excluded(v_rule.generation_cursor->'type_pauses',v_day,(v_calendar->>'end_date')::date) then
            v_calendar:=v_calendar||jsonb_build_object('employment_event',jsonb_build_object('event_id',v_event->>'event_id','event_type',v_event->>'event_type','occurred_on',v_event->>'occurred_on','requested_on',v_day));
            v_applicable:=jsonb_array_length(v_config.applicability_conditions->'termination_reasons')=0 or coalesce(v_config.applicability_conditions->'termination_reasons' ? v_stage.termination_reason,false);
            v_destination:=jsonb_build_object('destination_key','employment_period:'||v_stage.id,'employment_period_id',v_stage.id,'worker_id',v_stage.worker_id,'applicable',v_applicable,
              'exclusion_reason',case when not v_applicable then 'El motivo de cese no cumple las condiciones de esta versión.' end);
            select id into v_existing from public.obligations where organization_id=v_rule.organization_id and rule_id=v_rule.id and destination_key='employment_period:'||v_stage.id and occurrence_key=v_calendar->>'key';
            v_obligation:=private.h04_emit(v_rule,v_config,v_calendar,v_destination,p_actor,p_request);
            if v_existing is null then v_new:=v_new+1; v_phase_new:=v_phase_new+1; end if;
          end if;
        end if;
        v_cursor:=v_rule.id::text; v_count:=v_count+1;
      end loop;
      v_event:=v_event||jsonb_build_object('last_rule_id',v_cursor,'last_attempt_at',now(),'last_error',null,'generated_count',coalesce((v_event->>'generated_count')::integer,0)+v_phase_new,'status',case when v_more then 'pending' else 'completed' end);
    exception when others then
      -- The whole phase batch rolls back; already committed batches stay intact.
      v_event:=(v_state->v_phase)||jsonb_build_object('status','failed','last_attempt_at',now(),'last_error','DEPENDENCY_UNAVAILABLE');
      v_state:=jsonb_set(v_state,array[v_phase],v_event);
      update public.employment_periods set document_generation=v_state where id=v_stage.id;
      return jsonb_build_object('status','pending','generated_count',0,'error_code','DEPENDENCY_UNAVAILABLE');
    end;
    v_state:=jsonb_set(v_state,array[v_phase],v_event);
    if v_count>=p_limit then exit; end if;
  end loop;
  update public.employment_periods set document_generation=v_state where id=v_stage.id;
  return jsonb_build_object('status',case when exists(select 1 from jsonb_each(v_state) e where e.key<>'schema_version' and e.value->>'status' in ('pending','failed')) then 'pending' else 'completed' end,'generated_count',v_new);
end $$;
revoke all on function private.h05_process_employment(uuid,uuid,uuid,integer) from public,anon,authenticated;

create function public.h05_run_generation(p_employment_period_id uuid default null,p_batch_size integer default 25) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_org uuid; v_worker uuid; v_stage uuid;
begin
  if auth.role() is distinct from 'service_role' and session_user<>'postgres' then perform private.fail('FORBIDDEN'); end if;
  select o.id into v_org from public.organizations o where o.deleted_at is null and o.status='active' and exists(
    select 1 from public.employment_periods e join public.workers w on w.id=e.worker_id join public.companies c on c.id=e.company_id
    where e.organization_id=o.id and (p_employment_period_id is null or e.id=p_employment_period_id) and w.deleted_at is null and c.deleted_at is null and c.status='active'
      and exists(select 1 from jsonb_each(e.document_generation) j where j.key<>'schema_version' and j.value->>'status' in ('pending','failed') and (j.value->>'reference_date')::date<=(now() at time zone 'America/Lima')::date))
    order by o.id limit 1 for update of o skip locked;
  if v_org is null then return jsonb_build_object('status','idle'); end if;
  select e.id,e.worker_id into v_stage,v_worker from public.employment_periods e join public.workers w on w.id=e.worker_id join public.companies c on c.id=e.company_id
    where e.organization_id=v_org and (p_employment_period_id is null or e.id=p_employment_period_id) and w.deleted_at is null and c.deleted_at is null and c.status='active'
      and exists(select 1 from jsonb_each(e.document_generation) j where j.key<>'schema_version' and j.value->>'status' in ('pending','failed') and (j.value->>'reference_date')::date<=(now() at time zone 'America/Lima')::date)
    order by e.updated_at,e.id limit 1;
  perform 1 from public.workers where id=v_worker for update;
  return private.h05_process_employment(v_stage,null,gen_random_uuid(),p_batch_size);
end $$;
revoke all on function public.h05_run_generation(uuid,integer) from public,anon,authenticated;
grant execute on function public.h05_run_generation(uuid,integer) to service_role;

create function public.h05_schedule_generation(p_enabled boolean default true) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.role() is distinct from 'service_role' then perform private.fail('FORBIDDEN'); end if;
  if p_enabled then perform cron.schedule('h05-employment-continuation','* * * * *','select public.h05_run_generation();');
  else perform cron.unschedule(jobid) from cron.job where jobname='h05-employment-continuation'; end if;
end $$;
revoke all on function public.h05_schedule_generation(boolean) from public,anon,authenticated;
grant execute on function public.h05_schedule_generation(boolean) to service_role;

create or replace function private.h04_destinations(p_rule public.requirement_rules, p_config public.rule_versions, p_period jsonb,
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
    and not private.h04_period_excluded(w.operation_pauses,greatest((p_period->>'start_date')::date,e.start_date,p_rule.control_start_date),(p_period->>'end_date')::date)
    and e.created_at<=p_started_at and (p_rule.employment_period_id is null or e.id=p_rule.employment_period_id)
    and (p_event is null or p_event->>'employment_period_id' is null or e.id=(p_event->>'employment_period_id')::uuid)
    and case when p_event->>'event_type'='worker_hired' then e.start_date=(p_period->>'reference_date')::date
      when p_event->>'event_type'='worker_terminated' then e.end_date=(p_period->>'reference_date')::date
      else e.start_date<=(p_period->>'end_date')::date and (e.end_date is null or e.end_date>=(p_period->>'start_date')::date) end;
$$;


create or replace function private.h04_emit(p_rule public.requirement_rules,p_config public.rule_versions,p_period jsonb,p_destination jsonb,p_actor uuid,p_request uuid)
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
  if p_period ? 'employment_event' then v_snapshot:=v_snapshot||jsonb_build_object('employment_event',p_period->'employment_event'); end if;
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


