create function private.h04_configure(org uuid,actor uuid,req uuid,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_rule public.requirement_rules; v_company public.companies; v_type public.document_types; v_previous public.rule_versions; v_current public.rule_versions;
  v_id uuid:=coalesce((input->>'id')::uuid,gen_random_uuid()); v_version uuid:=gen_random_uuid(); v_frequency text:=coalesce(input->>'frequency','mensual');
  v_active boolean; v_inherit boolean:=coalesce((input->>'inherit_responsible')::boolean,true); v_responsible uuid;
  v_formats text[]; v_specs jsonb:=input->'deliverable_specs'; v_maximum bigint:=coalesce((input->>'max_file_bytes')::bigint,20000000);
  v_today date:=(now() at time zone 'America/Lima')::date; v_effective date; v_minimum date; v_period jsonb;
  v_conditions jsonb:=coalesce(input->'applicability_conditions','{"schema_version":1,"employment_stage":"any","event_types":[],"termination_reasons":[]}');
begin
  perform private.assert_member(org,actor,true);
  select * into v_rule from public.requirement_rules where organization_id=org and id=v_id for update;
  if input->>'id' is not null and (v_rule.id is null or v_rule.deleted_at is not null) then perform private.fail('NOT_FOUND'); end if;
  if v_rule.id is not null and (input->>'expected_revision')::integer is distinct from v_rule.revision then perform private.fail('CONFLICT'); end if;
  select * into v_company from public.companies where organization_id=org and id=(input->>'company_id')::uuid and deleted_at is null and status='active';
  select * into v_type from public.document_types where organization_id=org and id=(input->>'document_type_id')::uuid and deleted_at is null and active;
  if v_company.id is null or v_type.id is null or nullif(btrim(input->>'title'),'') is null or length(input->>'title')>150 then perform private.fail('VALIDATION_ERROR'); end if;
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
  if v_inherit then select delivery_responsible_id into v_responsible from public.company_module_settings where organization_id=org and company_id=v_company.id and module=v_type.module and deleted_at is null;
  else v_responsible:=(input->>'delivery_responsible_id')::uuid; end if;
  v_active:=coalesce((input->>'active')::boolean,v_rule.active,not (input ? 'frequency'));
  if v_active and (v_responsible is null or not private.has_permission(org,v_responsible,v_company.id,v_type.module,'upload')) then perform private.fail('VALIDATION_ERROR'); end if;
  if v_rule.id is null then
    v_effective:=greatest(v_company.control_start_date,coalesce((nullif(input->>'control_start_date',''))::date,v_today),v_today);
    v_period:=private.h04_calendar(v_frequency,v_effective,(nullif(input->>'anchor_date',''))::date,(input->>'interval_count')::integer,input->>'interval_unit',v_id::text);
    insert into public.requirement_rules(id,organization_id,document_type_id,module,target_scope,company_id,employment_period_id,title,description,inherit_responsible,delivery_responsible_id,control_start_date,created_by,updated_by)
      values(v_id,org,v_type.id,v_type.module,case when input->>'employment_period_id' is null then 'company' else 'employment_period' end,v_company.id,(input->>'employment_period_id')::uuid,
        btrim(input->>'title'),nullif(btrim(input->>'description'),''),v_inherit,case when not v_inherit then v_responsible end,v_effective,actor,actor);
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

alter function private.document_command(uuid,uuid,uuid,text,jsonb) rename to document_command_h03;
create function private.document_command(org uuid,actor uuid,req uuid,op text,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_rule public.requirement_rules; v_version public.rule_versions; v_type public.document_types; v_result jsonb; v_data jsonb;
  v_responsible uuid; v_active boolean; v_obligation public.obligations; v_today date:=(now() at time zone 'America/Lima')::date;
begin
  if op='ConfigureRequirement' then return private.h04_configure(org,actor,req,input); end if;
  if op='SaveDocumentType' then
    perform private.assert_member(org,actor,true);
    if not private.valid_formats(array(select jsonb_array_elements_text(input->'suggested_formats'))) then perform private.fail('VALIDATION_ERROR'); end if;
    select * into v_type from public.document_types where organization_id=org and id=(input->>'id')::uuid;
    v_result:=private.persist(org,actor,req,'document_types',input,array['code','name','module','category','description','suggested_formats','active']);
    if v_type.id is not null and v_type.active is distinct from (input->>'active')::boolean then
      update public.requirement_rules set generation_cursor=generation_cursor||jsonb_build_object('type_pauses',private.pause_intervals(generation_cursor->'type_pauses',not (input->>'active')::boolean,'inactive','Estado del tipo documental',actor)) where organization_id=org and document_type_id=v_type.id;
    end if;
    return v_result;
  end if;
  if op in ('DeleteDocumentEntity','RestoreDocumentEntity') and input->>'entity'='document_types' then
    v_result:=private.document_command_h03(org,actor,req,op,input);
    update public.requirement_rules set generation_cursor=generation_cursor||jsonb_build_object('type_pauses',private.pause_intervals(generation_cursor->'type_pauses',op='DeleteDocumentEntity','soft_delete','Eliminación/restauración del tipo documental',actor))
      where organization_id=org and document_type_id=(input->>'id')::uuid;
    return v_result;
  end if;
  if op in ('GenerateRule','GenerateMonthly','SetRuleActive','EmitRequirementEvent') then
    perform private.assert_member(org,actor,true);
    select * into v_rule from public.requirement_rules where organization_id=org and id=(input->>'rule_id')::uuid for update;
    if v_rule.id is null or v_rule.deleted_at is not null then perform private.fail('NOT_FOUND'); end if;
    if op='SetRuleActive' then
      if (input->>'expected_revision')::integer is distinct from v_rule.revision then perform private.fail('CONFLICT'); end if;
      v_active:=(input->>'active')::boolean;
      if v_active is null or (not v_active and nullif(btrim(input->>'reason'),'') is null) then perform private.fail('VALIDATION_ERROR'); end if;
      select * into v_version from public.rule_versions where id=v_rule.current_version_id;
      v_responsible:=v_rule.delivery_responsible_id;
      if v_rule.inherit_responsible then select delivery_responsible_id into v_responsible from public.company_module_settings where organization_id=org and company_id=v_rule.company_id and module=v_rule.module and deleted_at is null; end if;
      if v_active and (v_responsible is null or not private.has_permission(org,v_responsible,v_rule.company_id,v_rule.module,'upload')
        or not exists(select 1 from public.document_types where id=v_rule.document_type_id and organization_id=org and active and deleted_at is null)) then perform private.fail('VALIDATION_ERROR'); end if;
      update public.requirement_rules set active=v_active,operation_pauses=private.pause_intervals(operation_pauses,not v_active,'rule_paused',coalesce(input->>'reason','Activación'),actor),
        revision=revision+1,updated_at=now(),updated_by=actor where id=v_rule.id;
      perform private.h04_audit(org,actor,req,op,'requirement_rules',v_rule.id,to_jsonb(v_rule),(select to_jsonb(r) from public.requirement_rules r where id=v_rule.id));
      return jsonb_build_object('schema_version',1,'resource_id',v_rule.id,'revision',v_rule.revision+1,'status','completed');
    end if;
    if op='EmitRequirementEvent' then
      if (input->>'event_id')::uuid is null or (input->>'reference_date')::date is null or (input->>'reference_date')::date>v_today then perform private.fail('VALIDATION_ERROR'); end if;
      if v_rule.module='laboral_trabajador' and (input->>'employment_period_id')::uuid is null then perform private.fail('VALIDATION_ERROR'); end if;
      if input->>'event_type' in ('worker_hired','worker_terminated') and v_rule.module<>'laboral_trabajador' then perform private.fail('VALIDATION_ERROR'); end if;
      v_data:=input;
    end if;
    return private.h04_generate(v_rule.id,actor,req,v_today,coalesce((input->>'batch_size')::integer,50),v_data);
  end if;
  if op='ReassignDelivery' then
    perform private.assert_member(org,actor,true);
    select * into v_obligation from public.obligations where organization_id=org and id=(input->>'obligation_id')::uuid for update;
    if v_obligation.id is null then perform private.fail('NOT_FOUND'); end if;
    if (input->>'expected_revision')::integer is distinct from v_obligation.revision then perform private.fail('CONFLICT'); end if;
    v_responsible:=(input->>'delivery_responsible_id')::uuid;
    if nullif(btrim(input->>'reason'),'') is null or v_responsible is null or not private.has_permission(org,v_responsible,v_obligation.company_id,v_obligation.module,'upload') then perform private.fail('VALIDATION_ERROR'); end if;
    update public.obligations set delivery_responsible_id=v_responsible,assignment_issue=false,updated_at=now(),updated_by=actor,revision=revision+1 where id=v_obligation.id;
    perform private.h04_audit(org,actor,req,op,'obligations',v_obligation.id,to_jsonb(v_obligation),(select to_jsonb(o) from public.obligations o where id=v_obligation.id));
    perform private.h04_assignment_event((select o from public.obligations o where id=v_obligation.id),actor,'reassigned','reassigned:'||v_obligation.id||':'||(v_obligation.revision+1));
    return jsonb_build_object('schema_version',1,'resource_id',v_obligation.id,'revision',v_obligation.revision+1,'status','completed');
  end if;
  return private.document_command_h03(org,actor,req,op,input);
end $$;

-- Keep the common request/idempotency contract; add durable, sanitized generation errors.
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
      update public.requirement_rules set generation_cursor=generation_cursor||jsonb_build_object('last_error',error_code,'last_attempt_at',now()) where organization_id=p_organization_id and id=(p_input->>'rule_id')::uuid;
    end if;
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code',error_code));
  end;
  update public.operation_requests set status='completed',result=body.result,completed_at=now(),error_code=null,updated_at=now(),revision=revision+1 where id=entry.id;
  return jsonb_build_object('ok',true,'data',result);
exception when raise_exception then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',sqlerrm));
end $$;
