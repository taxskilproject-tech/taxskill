-- Module settings have lifecycle metadata, not an active flag.
create or replace function private.configure_monthly(org uuid, actor uuid, req uuid, input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare company public.companies; dtype public.document_types; rule_id uuid := gen_random_uuid(); version_id uuid := gen_random_uuid();
  responsible uuid; formats text[]; maximum bigint; specs jsonb := input->'deliverable_specs';
begin
  perform private.assert_member(org,actor,true);
  select * into company from public.companies where organization_id=org and id=(input->>'company_id')::uuid and deleted_at is null and status='active';
  select * into dtype from public.document_types where organization_id=org and id=(input->>'document_type_id')::uuid and deleted_at is null and active;
  if company.id is null or dtype.id is null or dtype.module<>'tributario' then perform private.fail('VALIDATION_ERROR'); end if;
  select array_agg(value) into formats from jsonb_array_elements_text(input->'allowed_formats');
  select (settings->>'default_max_file_bytes')::bigint into maximum from public.organizations where id=org;
  maximum := coalesce((input->>'max_file_bytes')::bigint,maximum,20000000);
  if not private.valid_formats(formats) or not private.valid_specs(specs,formats,maximum) or jsonb_array_length(specs)<>2
    or coalesce((input->>'deadline_offset_days')::integer,0) not between -366 and 366 then perform private.fail('VALIDATION_ERROR'); end if;
  if coalesce((input->>'inherit_responsible')::boolean,true) then
    select delivery_responsible_id into responsible from public.company_module_settings where organization_id=org and company_id=company.id and module=dtype.module and deleted_at is null;
  else responsible := (input->>'delivery_responsible_id')::uuid;
  end if;
  if responsible is null or not private.has_permission(org,responsible,company.id,dtype.module,'upload') then perform private.fail('VALIDATION_ERROR'); end if;
  insert into public.requirement_rules(id,organization_id,document_type_id,module,target_scope,company_id,title,description,inherit_responsible,delivery_responsible_id,control_start_date,created_by,updated_by)
    values(rule_id,org,dtype.id,dtype.module,'company',company.id,btrim(input->>'title'),nullif(btrim(input->>'description'),''),coalesce((input->>'inherit_responsible')::boolean,true),
      case when coalesce((input->>'inherit_responsible')::boolean,true) then null else responsible end,
      greatest(company.control_start_date,coalesce((input->>'control_start_date')::date,(now() at time zone 'America/Lima')::date)),actor,actor);
  insert into public.rule_versions(id,organization_id,rule_id,version_number,effective_from,frequency,deadline_offset_days,is_required,priority,allowed_formats,max_file_bytes,deliverable_specs,created_by)
    values(version_id,org,rule_id,1,date_trunc('month',now() at time zone 'America/Lima')::date,'mensual',(input->>'deadline_offset_days')::integer,
      coalesce((input->>'is_required')::boolean,true),coalesce(input->>'priority','media'),formats,maximum,specs,actor);
  update public.requirement_rules set current_version_id=version_id,active=true where id=rule_id;
  perform private.audit(org,actor,req,'ConfigureRequirement','requirement_rules',rule_id,null,jsonb_build_object('title',input->>'title','active',true));
  return jsonb_build_object('schema_version',1,'resource_id',rule_id,'revision',0,'status','completed');
end $$;

create or replace function private.generate_monthly(org uuid, actor uuid, req uuid, input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare rule public.requirement_rules; config public.rule_versions; company public.companies; responsible uuid;
  period_id uuid; obligation_id uuid; slot_id uuid; slot jsonb; snapshot jsonb;
  today date := (now() at time zone 'America/Lima')::date; start_day date; end_day date; due_day date; occurrence text;
begin
  perform private.assert_member(org,actor,true);
  select * into rule from public.requirement_rules where organization_id=org and id=(input->>'rule_id')::uuid and active and deleted_at is null for update;
  if rule.id is null then perform private.fail('NOT_FOUND'); end if;
  select * into company from public.companies where organization_id=org and id=rule.company_id and deleted_at is null and status='active';
  select * into config from public.rule_versions where organization_id=org and id=rule.current_version_id;
  if company.id is null or config.frequency<>'mensual' or rule.control_start_date>today or config.effective_from>today or
    not exists(select 1 from public.document_types where organization_id=org and id=rule.document_type_id and active and deleted_at is null) then perform private.fail('VALIDATION_ERROR'); end if;
  start_day := date_trunc('month',today)::date; end_day := (start_day+interval '1 month'-interval '1 day')::date; occurrence := to_char(start_day,'YYYY-MM');
  select id into obligation_id from public.obligations where organization_id=org and rule_id=rule.id and destination_key='company:'||company.id and occurrence_key=occurrence;
  if obligation_id is not null then return jsonb_build_object('schema_version',1,'resource_id',obligation_id,'revision',0,'status','completed'); end if;
  responsible := rule.delivery_responsible_id;
  if rule.inherit_responsible then
    select delivery_responsible_id into responsible from public.company_module_settings where organization_id=org and company_id=company.id and module=rule.module and deleted_at is null;
  end if;
  if responsible is not null and not private.has_permission(org,responsible,company.id,rule.module,'upload') then responsible := null; end if;
  insert into public.periods(organization_id,kind,period_key,start_date,end_date,created_by) values(org,'monthly',occurrence,start_day,end_day,actor)
    on conflict(organization_id,kind,period_key) do nothing;
  select id into period_id from public.periods where organization_id=org and kind='monthly' and period_key=occurrence;
  due_day := end_day+config.deadline_offset_days;
  snapshot := jsonb_build_object('schema_version',1,'source',jsonb_build_object('rule_id',rule.id,'rule_version_id',config.id,'document_type_id',rule.document_type_id,'version_number',config.version_number,'class',rule.class),
    'module',rule.module,'title',rule.title,'destination',jsonb_build_object('scope','company','company_id',company.id,'company_legal_name',company.legal_name,'company_ruc',company.ruc,'employment_period_id',null,'worker_id',null),
    'recurrence',jsonb_build_object('frequency','mensual','interval_count',null,'interval_unit',null,'anchor_date',null,'deadline_offset_days',config.deadline_offset_days),
    'occurrence',jsonb_build_object('destination_key','company:'||company.id,'occurrence_key',occurrence,'period_id',period_id,'period_start',start_day,'period_end',end_day),
    'initial_due_date',due_day,'is_required',config.is_required,'initial_priority',config.priority,'initial_responsible_id',responsible,'allowed_formats',to_jsonb(config.allowed_formats),
    'max_file_bytes',config.max_file_bytes,'deliverables',config.deliverable_specs,'applicability_conditions',config.applicability_conditions);
  insert into public.obligations(organization_id,class,company_id,module,period_id,rule_id,rule_version_id,document_type_id,destination_key,occurrence_key,title,description,initial_due_date,delivery_responsible_id,assignment_issue,priority,is_required,snapshot,created_by,updated_by)
    values(org,rule.class,company.id,rule.module,period_id,rule.id,config.id,rule.document_type_id,'company:'||company.id,occurrence,rule.title,rule.description,due_day,responsible,responsible is null,config.priority,config.is_required,snapshot,actor,actor) returning id into obligation_id;
  for slot in select value from jsonb_array_elements(config.deliverable_specs) loop
    insert into public.deliverables(organization_id,obligation_id,position_code,label,display_order,created_by,updated_by)
      values(org,obligation_id,slot->>'position_code',slot->>'label',(slot->>'display_order')::integer,actor,actor) returning id into slot_id;
    insert into public.submission_cycles(organization_id,deliverable_id,cycle_number,reason,due_date,created_by,updated_by) values(org,slot_id,1,'initial',due_day,actor,actor);
  end loop;
  update public.requirement_rules set generation_cursor=jsonb_build_object('schema_version',1,'rule_version_id',config.id,'last_completed_occurrence',occurrence,'processing_occurrence',null,'next_destination_key',null,'last_generated_at',now()),updated_at=now(),updated_by=actor,revision=revision+1 where id=rule.id;
  perform private.audit(org,actor,req,'GenerateMonthly','obligations',obligation_id,null,jsonb_build_object('title',rule.title,'priority',config.priority));
  perform private.document_event((select o from public.obligations o where id=obligation_id),actor,'assigned','assigned:'||obligation_id);
  return jsonb_build_object('schema_version',1,'resource_id',obligation_id,'revision',0,'status','completed');
end $$;

