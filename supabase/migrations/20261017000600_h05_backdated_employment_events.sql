create or replace function private.h05_process_employment(p_id uuid,p_actor uuid,p_request uuid,p_limit integer default 25) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_stage public.employment_periods; v_worker public.workers; v_company public.companies; v_rule public.requirement_rules; v_config public.rule_versions;
  v_phase text; v_event jsonb; v_calendar jsonb; v_destination jsonb; v_state jsonb; v_day date; v_configuration_day date; v_count integer:=0; v_new integer:=0; v_phase_new integer:=0; v_more boolean;
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
    v_configuration_day:=greatest(v_day,((v_event->>'requested_at')::timestamptz at time zone 'America/Lima')::date);
    v_cursor:=v_event->>'last_rule_id'; v_more:=false; v_phase_new:=0;
    begin
      for v_rule in select r.* from public.requirement_rules r join public.document_types d on d.organization_id=r.organization_id and d.id=r.document_type_id
        where r.organization_id=v_stage.organization_id and r.company_id=v_stage.company_id and r.module='laboral_trabajador' and r.active and r.deleted_at is null and d.active and d.deleted_at is null
          and (r.employment_period_id is null or r.employment_period_id=v_stage.id) and r.created_at<=(v_event->>'requested_at')::timestamptz
          and (v_cursor is null or r.id::text>v_cursor) order by r.id limit p_limit-v_count+1 loop
        if v_count>=p_limit then v_more:=true; exit; end if;
        select * into v_config from public.rule_versions where organization_id=v_rule.organization_id and rule_id=v_rule.id and effective_from<=v_configuration_day order by effective_from desc,version_number desc limit 1;
        if v_config.id is not null and v_rule.control_start_date<=v_configuration_day then
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


