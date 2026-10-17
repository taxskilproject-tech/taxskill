-- Extend the existing versioned engine to additional company/study activities.
create or replace function private.h04_configure(org uuid,actor uuid,req uuid,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_rule public.requirement_rules; v_company public.companies; v_type public.document_types; v_previous public.rule_versions; v_current public.rule_versions;
  v_id uuid:=coalesce((input->>'id')::uuid,gen_random_uuid()); v_version uuid:=gen_random_uuid(); v_frequency text:=coalesce(input->>'frequency','mensual');
  v_additional boolean:=coalesce(input->>'class',v_rule.class,'documentary')='additional'; v_module text; v_scope text;
  v_active boolean; v_inherit boolean:=coalesce((input->>'inherit_responsible')::boolean,true); v_responsible uuid;
  v_formats text[]; v_specs jsonb:=input->'deliverable_specs'; v_maximum bigint:=coalesce((input->>'max_file_bytes')::bigint,20000000);
  v_today date:=(now() at time zone 'America/Lima')::date; v_effective date; v_minimum date; v_period jsonb;
  v_conditions jsonb:=coalesce(input->'applicability_conditions','{"schema_version":1,"employment_stage":"any","event_types":[],"termination_reasons":[]}');
begin
  perform private.assert_member(org,actor,true);
  select * into v_rule from public.requirement_rules where organization_id=org and id=v_id for update;
  if input->>'id' is not null and (v_rule.id is null or v_rule.deleted_at is not null) then perform private.fail('NOT_FOUND'); end if;
  if v_rule.id is not null and (input->>'expected_revision')::integer is distinct from v_rule.revision then perform private.fail('CONFLICT'); end if;
  v_additional:=coalesce(input->>'class',v_rule.class,'documentary')='additional';
  v_module:=case when v_additional then 'actividades' end;
  v_scope:=case when v_additional and input->>'company_id' is null then 'organization' when input->>'employment_period_id' is not null then 'employment_period' else 'company' end;
  if v_scope='organization' then v_inherit:=false; end if;
  select * into v_company from public.companies where organization_id=org and id=(input->>'company_id')::uuid and deleted_at is null and status='active';
  select * into v_type from public.document_types where organization_id=org and id=(input->>'document_type_id')::uuid and deleted_at is null and active;
  v_module:=coalesce(v_module,v_type.module);
  if (input->>'company_id' is not null and v_company.id is null) or (not v_additional and (v_company.id is null or v_type.id is null)) or (v_additional and (input->>'document_type_id' is not null or input->>'employment_period_id' is not null or v_frequency='eventual')) or nullif(btrim(input->>'title'),'') is null or length(input->>'title')>150 then perform private.fail('VALIDATION_ERROR'); end if;
  if v_rule.id is not null and (v_rule.company_id is distinct from v_company.id or v_rule.document_type_id is distinct from v_type.id
    or v_rule.employment_period_id is distinct from (input->>'employment_period_id')::uuid) then perform private.fail('VALIDATION_ERROR'); end if;
  select array_agg(value) into v_formats from jsonb_array_elements_text(input->'allowed_formats');
  if not private.valid_formats(v_formats) or not private.valid_specs(v_specs,v_formats,v_maximum) or jsonb_array_length(v_specs)>20
    or v_maximum not between 1 and 50000000 or input->>'deadline_offset_days' is null
    or (input->>'deadline_offset_days')::integer not between -366 and 366 or not private.h04_conditions_valid(v_conditions)
    then perform private.fail('VALIDATION_ERROR'); end if;
  if v_frequency='unica' and (input->>'deadline_offset_days')::integer<>0 then perform private.fail('VALIDATION_ERROR'); end if;
  if v_conditions->>'employment_stage' in ('ingreso','cese') and (v_type.module<>'laboral_trabajador' or v_frequency<>'eventual'
    or not (v_conditions->'event_types') ? case when v_conditions->>'employment_stage'='ingreso' then 'worker_hired' else 'worker_terminated' end)
    then perform private.fail('VALIDATION_ERROR'); end if;
  if v_type.module<>'laboral_trabajador' and (v_conditions->>'employment_stage'<>'any' or v_conditions->'event_types' ?| array['worker_hired','worker_terminated']) then perform private.fail('VALIDATION_ERROR'); end if;
  if (v_frequency='eventual') is distinct from (jsonb_array_length(v_conditions->'event_types')>0) then perform private.fail('VALIDATION_ERROR'); end if;
  if v_inherit then select delivery_responsible_id into v_responsible from public.company_module_settings where organization_id=org and company_id=v_company.id and module=v_module and deleted_at is null;
  else v_responsible:=(input->>'delivery_responsible_id')::uuid; end if;
  if not v_inherit and (v_responsible is null or not exists(select 1 from public.organization_members where organization_id=org and user_id=v_responsible and deleted_at is null)) then perform private.fail('VALIDATION_ERROR'); end if;
  v_active:=coalesce((input->>'active')::boolean,v_rule.active,not (input ? 'frequency'));
  if v_active and (v_responsible is null or not private.has_permission(org,v_responsible,v_company.id,v_module,'upload')) then perform private.fail('VALIDATION_ERROR'); end if;
  if v_rule.id is null then
    v_effective:=greatest(v_company.control_start_date,coalesce((nullif(input->>'control_start_date',''))::date,v_today),v_today);
    v_period:=private.h04_calendar(v_frequency,v_effective,(nullif(input->>'anchor_date',''))::date,(input->>'interval_count')::integer,input->>'interval_unit',v_id::text);
    insert into public.requirement_rules(id,organization_id,class,document_type_id,module,target_scope,company_id,employment_period_id,title,description,inherit_responsible,delivery_responsible_id,control_start_date,created_by,updated_by)
      values(v_id,org,case when v_additional then 'additional' else 'documentary' end,v_type.id,v_module,v_scope,v_company.id,(input->>'employment_period_id')::uuid,
        btrim(input->>'title'),nullif(btrim(input->>'description'),''),v_inherit,case when not v_inherit then v_responsible end,v_effective,actor,actor);
    if not v_active then update public.requirement_rules set operation_pauses=private.pause_intervals(operation_pauses,true,'rule_paused','Borrador inicial',actor) where id=v_id; end if;
    -- The first occurrence may start earlier than onboarding, but never emits an earlier occurrence.
    v_effective:=least(v_effective,(v_period->>'start_date')::date);
  else
    select * into v_previous from public.rule_versions where id=v_rule.current_version_id;
    select * into v_current from public.rule_versions where organization_id=org and rule_id=v_id and effective_from<=v_today order by effective_from desc,version_number desc limit 1;
    if v_current.id is null then v_current:=v_previous; end if;
    if v_current.frequency in ('unica','eventual') then v_minimum:=v_today+1;
    else v_period:=private.h04_calendar(v_current.frequency,v_today,v_current.anchor_date,v_current.interval_count,v_current.interval_unit,v_id::text); v_minimum:=(v_period->>'end_date')::date+1; end if;
    v_effective:=coalesce((nullif(input->>'effective_from',''))::date,greatest(v_minimum,v_previous.effective_from));
    if v_effective<greatest(v_minimum,v_previous.effective_from) then perform private.fail('VALIDATION_ERROR'); end if;
    if v_current.frequency not in ('unica','eventual') and (private.h04_calendar(v_current.frequency,v_effective,v_current.anchor_date,v_current.interval_count,v_current.interval_unit,v_id::text)->>'start_date')::date<>v_effective then perform private.fail('VALIDATION_ERROR'); end if;
    update public.requirement_rules set title=btrim(input->>'title'),description=nullif(btrim(input->>'description'),''),inherit_responsible=v_inherit,
      delivery_responsible_id=case when not v_inherit then v_responsible end,updated_at=now(),updated_by=actor,revision=revision+1,
      operation_pauses=case when active is distinct from v_active then private.pause_intervals(operation_pauses,not v_active,'rule_paused','Cambio de activación de regla',actor) else operation_pauses end,
      active=false where id=v_id;
  end if;
  insert into public.rule_versions(id,organization_id,rule_id,version_number,effective_from,frequency,interval_count,interval_unit,anchor_date,deadline_offset_days,
    is_required,priority,allowed_formats,max_file_bytes,deliverable_specs,applicability_conditions,created_by)
    values(v_version,org,v_id,coalesce(v_previous.version_number,0)+1,v_effective,v_frequency,(input->>'interval_count')::integer,input->>'interval_unit',(nullif(input->>'anchor_date',''))::date,
      (input->>'deadline_offset_days')::integer,coalesce((input->>'is_required')::boolean,true),coalesce(input->>'priority','media'),v_formats,v_maximum,v_specs,v_conditions,actor);
  update public.requirement_rules set current_version_id=v_version,active=v_active where id=v_id;
  perform private.h04_audit(org,actor,req,'ConfigureRequirement','requirement_rules',v_id,to_jsonb(v_rule),(select to_jsonb(r) from public.requirement_rules r where id=v_id));
  return jsonb_build_object('schema_version',1,'resource_id',v_id,'revision',(select revision from public.requirement_rules where id=v_id),'status','completed','effective_from',v_effective);
end $$;


create or replace function public.h03_command(p_organization_id uuid,p_request_id uuid,p_operation text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
<<body>>
declare entry public.operation_requests; result jsonb; fingerprint text; error_code text;
begin
  perform 1 from public.organizations where id=p_organization_id for update;
  perform private.assert_member(p_organization_id,auth.uid()); perform private.admit_session(p_organization_id);
  if p_request_id is null or p_input is null or jsonb_typeof(p_input)<>'object' or length(p_input::text)>32768 then perform private.fail('VALIDATION_ERROR'); end if;
  if p_operation='RequestDownload' then
    perform private.document_access(p_organization_id,(select d.obligation_id from public.document_versions v join public.deliverables d on d.id=v.deliverable_id where v.organization_id=p_organization_id and v.id=(p_input->>'version_id')::uuid),auth.uid(),'download');
  end if;
  fingerprint:=encode(extensions.digest(convert_to(p_input::text,'utf8'),'sha256'),'hex');
  insert into public.operation_requests(organization_id,request_id,actor_user_id,actor_key,operation,input_hash,created_by)
    values(p_organization_id,p_request_id,auth.uid(),'user:'||auth.uid(),p_operation,fingerprint,auth.uid()) on conflict do nothing;
  select * into entry from public.operation_requests where organization_id=p_organization_id and actor_key='user:'||auth.uid() and operation=p_operation and request_id=p_request_id for update;
  if entry.input_hash<>fingerprint then perform private.fail('CONFLICT'); end if;
  if entry.status='completed' then return jsonb_build_object('ok',true,'data',entry.result); end if;
  begin result:=private.document_command(p_organization_id,auth.uid(),p_request_id,p_operation,p_input);
  exception when others then
    error_code:=case when sqlstate in ('23505','40001','40P01') then 'CONFLICT' when sqlstate in ('23502','23503','23514','22P02','22007','22008','22023') then 'VALIDATION_ERROR'
      when sqlstate='P0001' and sqlerrm in ('FORBIDDEN','UNAUTHENTICATED','NOT_FOUND','CONFLICT','VALIDATION_ERROR','FILE_TOO_LARGE','FILE_INVALID','FILE_MISSING') then sqlerrm else 'DEPENDENCY_UNAVAILABLE' end;
    update public.operation_requests set status='failed',error_code=body.error_code,revision=revision+1,updated_at=now() where id=entry.id;
    if p_operation in ('GenerateRule','GenerateMonthly','EmitRequirementEvent') then
      update public.requirement_rules set generation_cursor=generation_cursor||jsonb_build_object('last_error',error_code,'last_attempt_at',now()) where organization_id=p_organization_id and id::text=p_input->>'rule_id';
    end if;
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code',error_code));
  end;
  update public.operation_requests set status='completed',result=body.result,completed_at=now(),error_code=null,updated_at=now(),revision=revision+1 where id=entry.id;
  return jsonb_build_object('ok',true,'data',result);
exception when raise_exception then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',sqlerrm));
end $$;

create or replace function private.h04_generate(p_rule_id uuid,p_actor uuid,p_request uuid,p_today date,p_limit integer default 50,p_event jsonb default null)
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
    or (v_rule.company_id is not null and (v_company.id is null or v_company.deleted_at is not null or v_company.status<>'active'))
    or (v_rule.class='documentary' and not exists(select 1 from public.document_types where organization_id=v_rule.organization_id and id=v_rule.document_type_id and active and deleted_at is null))
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
    perform private.h04_validate_event(v_rule,v_config,p_event);
    v_period:=private.h04_calendar(v_config.frequency,v_reference,v_config.anchor_date,v_config.interval_count,v_config.interval_unit,
      v_rule.id::text||case when p_event is not null then ':'||(p_event->>'event_id') else '' end);
    if (private.h04_period_excluded(v_rule.operation_pauses,v_reference,(v_period->>'end_date')::date)
      or private.h04_period_excluded(v_company.operation_pauses,v_reference,(v_period->>'end_date')::date)
      or private.h04_period_excluded(v_org.operation_pauses,v_reference,(v_period->>'end_date')::date)
      or private.h04_period_excluded(v_cursor->'type_pauses',v_reference,(v_period->>'end_date')::date))
      and (p_event is not null or v_cursor->>'processing_occurrence' is null) then
      if p_event is not null then perform private.fail('VALIDATION_ERROR'); end if;
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
  if p_event is not null then
    update public.requirement_rules set generation_cursor=generation_cursor||jsonb_build_object('last_attempt_at',now(),'last_generated_at',now(),'last_error',null,'last_batch_count',v_generated,'warning',v_warning) where id=v_rule.id;
  end if;
  if v_first is null then
    select id into v_first from public.obligations where organization_id=v_rule.organization_id and rule_id=v_rule.id
      and occurrence_key=coalesce(v_period->>'key',v_cursor->>'last_completed_occurrence') order by destination_key limit 1;
  end if;
  return jsonb_build_object('schema_version',1,'resource_id',coalesce(v_first,v_rule.id),'obligation_id',v_first,
    'revision',(select revision from public.requirement_rules where id=v_rule.id),'status',case when v_pending then 'pending' else 'completed' end,
    'generated_count',v_generated,'processed_count',v_processed,'has_more',coalesce(v_pending,false),'warning',v_warning);
end $$;

create or replace function private.h04_destinations(p_rule public.requirement_rules, p_config public.rule_versions, p_period jsonb,
  p_started_at timestamptz, p_event jsonb default null)
returns table(destination_key text,employment_period_id uuid,worker_id uuid,applicable boolean,exclusion_reason text)
language sql stable security definer set search_path='' as $$
  select case when p_rule.company_id is null then 'organization:'||p_rule.organization_id else 'company:'||p_rule.company_id end,null::uuid,null::uuid,true,null::text where p_rule.module<>'laboral_trabajador'
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
    'module',p_rule.module,'title',p_config.configuration_snapshot->>'title','destination',jsonb_build_object('scope',case when p_rule.company_id is null then 'organization' when p_destination->>'employment_period_id' is null then 'company' else 'employment_period' end,
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

create or replace function public.h04_run_generation(p_rule_id uuid default null,p_batch_size integer default 50) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_org uuid; v_rule public.requirement_rules; v_result jsonb:='{}'; v_assignments integer; v_today date:=(now() at time zone 'America/Lima')::date;
begin
  if auth.role() is distinct from 'service_role' and session_user<>'postgres' then perform private.fail('FORBIDDEN'); end if;
  if p_batch_size not between 1 and 100 then perform private.fail('VALIDATION_ERROR'); end if;
  if p_rule_id is null and (now() at time zone 'America/Lima')::time<time '00:05' then return jsonb_build_object('ok',true,'status','waiting_daily_window'); end if;
  -- Same organization -> rule lock order as browser commands; each invocation is one bounded transaction.
  select o.id into v_org from public.organizations o where o.deleted_at is null and o.status='active'
    and (p_rule_id is null or exists(select 1 from public.requirement_rules r where r.organization_id=o.id and r.id=p_rule_id))
    and (p_rule_id is not null or exists(select 1 from public.requirement_rules r left join public.companies c on c.id=r.company_id left join public.document_types d on d.id=r.document_type_id
      where r.organization_id=o.id and (r.company_id is null or (c.deleted_at is null and c.status='active')) and (r.class='additional' or (d.deleted_at is null and d.active)) and private.h04_rule_pending(r,v_today))
      or exists(select 1 from public.obligations b join public.companies c on c.id=b.company_id where b.organization_id=o.id and b.disposition='active' and c.status='active' and c.deleted_at is null
        and b.assignment_issue is distinct from (b.delivery_responsible_id is null or not private.has_permission(o.id,b.delivery_responsible_id,b.company_id,b.module,'upload'))))
    order by o.id limit 1 for update of o skip locked;
  if v_org is null then return jsonb_build_object('ok',true,'status','idle'); end if;
  select r.* into v_rule from public.requirement_rules r left join public.companies c on c.id=r.company_id left join public.document_types d on d.id=r.document_type_id
    where r.organization_id=v_org and (p_rule_id is null or r.id=p_rule_id) and (r.company_id is null or (c.deleted_at is null and c.status='active')) and (r.class='additional' or (d.deleted_at is null and d.active))
      and private.h04_rule_pending(r,v_today) order by (r.generation_cursor->>'last_attempt_at')::timestamptz nulls first,r.id limit 1 for update of r skip locked;
  if v_rule.id is not null then
    begin
      v_result:=private.h04_generate(v_rule.id,null,gen_random_uuid(),v_today,p_batch_size);
    exception when others then
      update public.requirement_rules set generation_cursor=generation_cursor||jsonb_build_object('last_error','DEPENDENCY_UNAVAILABLE','last_attempt_at',now()) where id=v_rule.id;
      v_result:=jsonb_build_object('status','failed','error_code','DEPENDENCY_UNAVAILABLE');
    end;
  end if;
  v_assignments:=private.h04_reconcile_assignments(v_org,p_batch_size);
  return jsonb_build_object('ok',true,'rule_id',v_rule.id,'assignment_updates',v_assignments,'result',v_result);
end $$;

