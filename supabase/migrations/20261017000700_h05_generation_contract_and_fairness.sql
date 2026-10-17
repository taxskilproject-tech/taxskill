create unique index worker_identity_canonical on public.workers(organization_id,company_id,identity_type,upper(regexp_replace(btrim(identity_number),'\s+','','g')));

create function private.h05_generation_valid(p_value jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare v_phase jsonb; v_key text;
begin
  if jsonb_typeof(p_value)<>'object' or p_value->>'schema_version' is distinct from '1'
    or not p_value ?& array['schema_version','hire','termination','reconcile']
    or exists(select 1 from jsonb_object_keys(p_value) k where k not in ('schema_version','hire','termination','reconcile')) then return false; end if;
  foreach v_key in array array['hire','termination','reconcile'] loop
    v_phase:=p_value->v_key;
    if v_phase='null'::jsonb then continue; end if;
    if not coalesce(jsonb_typeof(v_phase)='object' and v_phase ?& array['event_id','event_type','occurred_on','reference_date','requested_at','last_rule_id','status','last_error','last_attempt_at','generated_count']
      and (v_phase->>'event_id')::uuid is not null and (v_phase->>'occurred_on')::date is not null and (v_phase->>'reference_date')::date is not null
      and (v_phase->>'requested_at')::timestamptz is not null and v_phase->>'status' in ('pending','failed','completed','skipped')
      and (v_phase->>'generated_count')::integer>=0 and (v_phase->>'event_type' is null or v_phase->>'event_type' in ('worker_hired','worker_terminated')),false) then return false; end if;
    perform (v_phase->>'last_rule_id')::uuid; perform (v_phase->>'last_attempt_at')::timestamptz;
    if exists(select 1 from jsonb_object_keys(v_phase) k where k not in ('event_id','event_type','occurred_on','reference_date','requested_at','last_rule_id','status','last_error','last_attempt_at','generated_count')) then return false; end if;
  end loop;
  return true;
exception when others then return false;
end $$;
alter table public.employment_periods add constraint employment_generation_contract check(private.h05_generation_valid(document_generation));
revoke all on function private.h05_generation_valid(jsonb) from public,anon,authenticated;
grant execute on function private.h05_generation_valid(jsonb) to service_role;
create or replace function private.h05_process_employment(p_id uuid,p_actor uuid,p_request uuid,p_limit integer default 25) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_stage public.employment_periods; v_worker public.workers; v_company public.companies; v_rule public.requirement_rules; v_config public.rule_versions;
  v_phase text; v_event jsonb; v_calendar jsonb; v_destination jsonb; v_state jsonb; v_day date; v_configuration_day date; v_count integer:=0; v_new integer:=0; v_phase_new integer:=0; v_committed integer:=0; v_more boolean;
  v_existing uuid; v_obligation uuid; v_applicable boolean; v_cursor text; v_today date:=(now() at time zone 'America/Lima')::date;
begin
  if p_limit is null or p_limit not between 1 and 100 then perform private.fail('VALIDATION_ERROR'); end if;
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
    v_cursor:=v_event->>'last_rule_id'; v_more:=false; v_phase_new:=0; v_committed:=v_new;
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
      return jsonb_build_object('status','pending','generated_count',v_committed,'error_code','DEPENDENCY_UNAVAILABLE');
    end;
    v_state:=jsonb_set(v_state,array[v_phase],v_event);
    if v_count>=p_limit then exit; end if;
  end loop;
  update public.employment_periods set document_generation=v_state where id=v_stage.id;
  return jsonb_build_object('status',case when exists(select 1 from jsonb_each(v_state) e where e.key<>'schema_version' and e.value->>'status' in ('pending','failed')) then 'pending' else 'completed' end,'generated_count',v_new);
end $$;
revoke all on function private.h05_process_employment(uuid,uuid,uuid,integer) from public,anon,authenticated;



create or replace function public.h05_run_generation(p_employment_period_id uuid default null,p_batch_size integer default 25) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_org uuid; v_worker uuid; v_stage uuid;
begin
  if auth.role() is distinct from 'service_role' and session_user<>'postgres' then perform private.fail('FORBIDDEN'); end if;
  if p_batch_size is null or p_batch_size not between 1 and 100 then perform private.fail('VALIDATION_ERROR'); end if;
  select o.id into v_org from public.organizations o where o.deleted_at is null and o.status='active' and exists(
    select 1 from public.employment_periods e join public.workers w on w.id=e.worker_id join public.companies c on c.id=e.company_id
    where e.organization_id=o.id and (p_employment_period_id is null or e.id=p_employment_period_id) and w.deleted_at is null and c.deleted_at is null and c.status='active'
      and exists(select 1 from jsonb_each(e.document_generation) j where j.key<>'schema_version' and j.value->>'status' in ('pending','failed') and (j.value->>'reference_date')::date<=(now() at time zone 'America/Lima')::date))
    order by o.id limit 1 for update of o skip locked;
  if v_org is null then return jsonb_build_object('status','idle'); end if;
  select e.id,e.worker_id into v_stage,v_worker from public.employment_periods e join public.workers w on w.id=e.worker_id join public.companies c on c.id=e.company_id
    where e.organization_id=v_org and (p_employment_period_id is null or e.id=p_employment_period_id) and w.deleted_at is null and c.deleted_at is null and c.status='active'
      and exists(select 1 from jsonb_each(e.document_generation) j where j.key<>'schema_version' and j.value->>'status' in ('pending','failed') and (j.value->>'reference_date')::date<=(now() at time zone 'America/Lima')::date)
    order by (select max((j.value->>'last_attempt_at')::timestamptz) from jsonb_each(e.document_generation) j where j.key<>'schema_version' and j.value->>'status' in ('pending','failed')) nulls first,e.id limit 1;
  perform 1 from public.workers where id=v_worker for update;
  return private.h05_process_employment(v_stage,null,gen_random_uuid(),p_batch_size);
end $$;
revoke all on function public.h05_run_generation(uuid,integer) from public,anon,authenticated;
grant execute on function public.h05_run_generation(uuid,integer) to service_role;


create or replace function private.h05_worker_command(p_org uuid,p_actor uuid,p_request uuid,p_operation text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_worker public.workers; v_stage public.employment_periods; v_company public.companies; v_result jsonb; v_generation jsonb;
  v_input jsonb:=p_input; v_id uuid; v_before jsonb; v_today date:=(now() at time zone 'America/Lima')::date;
begin
  if length(coalesce(p_input->>'reason',''))>1000 then perform private.fail('VALIDATION_ERROR'); end if;
  v_company:=private.h05_company_access(p_org,(p_input->>'company_id')::uuid,p_actor,'workers.manage');
  if p_operation='RegisterWorker' then
    if p_input ? 'id' or p_input ? 'expected_revision' then perform private.fail('VALIDATION_ERROR'); end if;
  else
    select * into v_worker from public.workers where organization_id=p_org and company_id=v_company.id and id=(p_input->>'worker_id')::uuid for update;
    if v_worker.id is null then perform private.fail('NOT_FOUND'); end if;
    if p_operation not in ('EndEmployment','CorrectEmployment','ReconcileEmployment') and (p_input->>'expected_revision')::integer is distinct from v_worker.revision then perform private.fail('CONFLICT'); end if;
    if p_operation<>'RestoreWorker' and v_worker.deleted_at is not null then perform private.fail('NOT_FOUND'); end if;
  end if;
  if p_operation in ('RegisterWorker','UpdateWorker') then
    if nullif(btrim(p_input->>'first_names'),'') is null or nullif(btrim(p_input->>'last_names'),'') is null
      or length(coalesce(p_input->>'email',''))>254 or (p_input->>'email' is not null and p_input->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
      or length(coalesce(p_input->>'phone',''))>40 or length(coalesce(p_input->>'address',''))>500 or length(coalesce(p_input->>'notes',''))>2000
      or (p_input->>'birth_date')::date>v_today then perform private.fail('VALIDATION_ERROR'); end if;
    if p_operation='UpdateWorker' then
      if exists(select 1 from public.employment_periods where worker_id=v_worker.id and start_date<(p_input->>'birth_date')::date) then perform private.fail('VALIDATION_ERROR'); end if;
      v_input:=v_input||jsonb_build_object('id',v_worker.id);
    end if;
    v_result:=private.persist(p_org,p_actor,p_request,'workers',v_input,array['company_id','identity_type','identity_number','first_names','last_names','birth_date','email','phone','address','notes']);
    if p_operation='RegisterWorker' and jsonb_typeof(p_input->'employment')='object' then
      select * into v_worker from public.workers where id=(v_result->>'resource_id')::uuid;
      v_id:=private.h05_start_employment(p_org,p_actor,p_request,v_worker,p_input->'employment');
    end if;
  elsif p_operation in ('DeleteWorker','RestoreWorker') then
    perform private.assert_member(p_org,p_actor,true);
    if nullif(btrim(p_input->>'reason'),'') is null or ((p_operation='RestoreWorker') is distinct from (v_worker.deleted_at is not null)) then perform private.fail('VALIDATION_ERROR'); end if;
    v_result:=private.persist(p_org,p_actor,p_request,'workers',jsonb_build_object('id',v_worker.id,'expected_revision',v_worker.revision,
      'deleted_at',case when p_operation='DeleteWorker' then now() end,'deleted_by',case when p_operation='DeleteWorker' then p_actor end,
      'deletion_reason',case when p_operation='DeleteWorker' then btrim(p_input->>'reason') end,
      'operation_pauses',private.pause_intervals(v_worker.operation_pauses,p_operation='DeleteWorker','soft_delete',p_input->>'reason',p_actor)),array['deleted_at','deleted_by','deletion_reason','operation_pauses']);
    if p_operation='RestoreWorker' then
      for v_stage in select * from public.employment_periods where organization_id=p_org and worker_id=v_worker.id loop
        update public.employment_periods set document_generation=private.h05_prepare_generation(v_stage,v_company.control_start_date,false,false,true) where id=v_stage.id;
      end loop;
    end if;
  elsif p_operation='StartEmployment' then
    v_id:=private.h05_start_employment(p_org,p_actor,p_request,v_worker,p_input);
  elsif p_operation in ('EndEmployment','CorrectEmployment','ReconcileEmployment') then
    select * into v_stage from public.employment_periods where organization_id=p_org and company_id=v_company.id and worker_id=v_worker.id and id=(p_input->>'employment_period_id')::uuid for update;
    if v_stage.id is null then perform private.fail('NOT_FOUND'); end if;
    if (p_input->>'expected_revision')::integer is distinct from v_stage.revision then perform private.fail('CONFLICT'); end if;
    v_before:=to_jsonb(v_stage); v_id:=v_stage.id;
    if p_operation='ReconcileEmployment' then
      update public.employment_periods set document_generation=private.h05_prepare_generation(v_stage,v_company.control_start_date,false,false,true) where id=v_id;
    else
      if p_operation='EndEmployment' and v_stage.end_date is not null then perform private.fail('CONFLICT'); end if;
      if p_operation='CorrectEmployment' and nullif(btrim(p_input->>'reason'),'') is null then perform private.fail('VALIDATION_ERROR'); end if;
      v_input:=v_before||p_input;
      if p_operation='CorrectEmployment' and (v_stage.end_date is null) is distinct from ((v_input->>'end_date') is null) then perform private.fail('VALIDATION_ERROR'); end if;
      perform private.h05_validate_employment(v_input,v_worker.birth_date);
      if p_operation='EndEmployment' and v_input->>'end_date' is null then perform private.fail('VALIDATION_ERROR'); end if;
      update public.employment_periods set start_date=(v_input->>'start_date')::date,end_date=(v_input->>'end_date')::date,
        termination_reason=v_input->>'termination_reason',termination_notes=v_input->>'termination_notes',position=v_input->>'position',department=v_input->>'department',contract_type=v_input->>'contract_type',
        reference_salary=(v_input->>'reference_salary')::numeric,currency=coalesce(v_input->>'currency','PEN'),updated_at=now(),updated_by=p_actor,revision=revision+1 where id=v_id returning * into v_stage;
      update public.employment_periods set document_generation=private.h05_prepare_generation(v_stage,v_company.control_start_date,p_operation='CorrectEmployment',v_stage.end_date is not null) where id=v_id;
      update public.workers set revision=revision+1,updated_at=now(),updated_by=p_actor where id=v_worker.id;
      perform private.audit(p_org,p_actor,p_request,p_operation,'employment_periods',v_id,v_before,to_jsonb(v_stage));
      if p_operation='CorrectEmployment' then update public.audit_events set metadata=metadata||jsonb_build_object('reason',p_input->>'reason') where organization_id=p_org and request_id=p_request and resource_id=v_id and action=p_operation; end if;
    end if;
  else perform private.fail('VALIDATION_ERROR'); end if;
  if v_id is not null then
    v_generation:=private.h05_process_employment(v_id,p_actor,p_request,25);
    if v_result is null then v_result:=jsonb_build_object('schema_version',1,'resource_id',v_id,'revision',(select revision from public.employment_periods where id=v_id),'status',v_generation->>'status'); end if;
    if p_operation='RegisterWorker' then v_result:=v_result||jsonb_build_object('revision',(select revision from public.workers where id=(v_result->>'resource_id')::uuid)); end if;
    v_result:=v_result||jsonb_build_object('employment_period_id',v_id,'generation',v_generation,'status',v_generation->>'status');
  end if;
  return v_result;
end $$;


