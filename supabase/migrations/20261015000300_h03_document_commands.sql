create function private.document_access(org uuid, obligation uuid, actor uuid, action_name text) returns public.obligations
language plpgsql security definer set search_path='' as $$
declare result public.obligations; member public.organization_members;
begin
  member := private.assert_member(org,actor);
  select o.* into result from public.obligations o left join public.companies c on c.organization_id=o.organization_id and c.id=o.company_id
    where o.organization_id=org and o.id=obligation and (o.company_id is null or c.deleted_at is null);
  if result.id is null then perform private.fail('NOT_FOUND'); end if;
  if not ((action_name='view' and member.is_admin) or private.has_permission(org,actor,result.company_id,result.module,action_name)) then perform private.fail('NOT_FOUND'); end if;
  return result;
end $$;
create function private.document_event(obligation public.obligations, actor uuid, p_event_type text, p_event_key text, review_id uuid default null, cycle uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare event_id uuid; payload jsonb; recipient uuid;
begin
  payload := jsonb_build_object('schema_version',1,'title',obligation.title,'body',case p_event_type when 'upload_finalized' then 'Hay un archivo recibido para revisión.' when 'observed' then 'Un archivo requiere corrección. Consulta el detalle.' when 'reopened' then 'Un archivo requiere una nueva entrega.' when 'approved' then 'Un archivo fue aprobado.' else 'Tienes una obligación asignada.' end,
    'target_path','/actividades/'||obligation.id,'priority',obligation.priority,'due_date',obligation.initial_due_date,
    'scope_label',coalesce(obligation.snapshot->'destination'->>'company_legal_name','Interna del estudio'));
  insert into public.notification_events(organization_id,event_key,event_type,company_id,module,obligation_id,cycle_id,review_event_id,payload,created_by)
    values(obligation.organization_id,p_event_key,p_event_type,obligation.company_id,obligation.module,obligation.id,cycle,review_id,payload,actor)
    on conflict(organization_id,event_key) do nothing returning id into event_id;
  if event_id is null then return; end if;
  for recipient in select m.user_id from public.organization_members m where m.organization_id=obligation.organization_id and m.user_id<>actor
    and private.has_permission(m.organization_id,m.user_id,obligation.company_id,obligation.module,'view')
    and (m.user_id=obligation.delivery_responsible_id or (p_event_type='upload_finalized' and (private.has_permission(m.organization_id,m.user_id,obligation.company_id,obligation.module,'approve') or private.has_permission(m.organization_id,m.user_id,obligation.company_id,obligation.module,'observe')))) loop
    insert into public.notifications(organization_id,recipient_id,event_id,title,body,target_path,created_by)
      values(obligation.organization_id,recipient,event_id,payload->>'title',payload->>'body',payload->>'target_path',actor) on conflict do nothing;
  end loop;
end $$;
create or replace function private.safe_audit(row_data jsonb) returns jsonb language sql immutable as $$
  select jsonb_object_agg(key,value) from jsonb_each(row_data) where key in
    ('status','enabled','active','revision','deleted_at','deleted_by','deletion_reason','delivery_responsible_id','role_id','permission_id','allowed','name','code','legal_name','member_type','is_admin','audience','disposition','disposition_reason','priority','current_version_id','review_state','due_date','start_date','end_date','title');
$$;

create function private.configure_monthly(org uuid, actor uuid, req uuid, input jsonb) returns jsonb
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
    select delivery_responsible_id into responsible from public.company_module_settings where organization_id=org and company_id=company.id and module=dtype.module and active and deleted_at is null;
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

create function private.generate_monthly(org uuid, actor uuid, req uuid, input jsonb) returns jsonb
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
    select delivery_responsible_id into responsible from public.company_module_settings where organization_id=org and company_id=company.id and module=rule.module and active and deleted_at is null;
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

create function private.reserve_upload(org uuid, actor uuid, req uuid, input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare slot public.deliverables; obligation public.obligations; cycle public.submission_cycles; specs jsonb;
  intent_id uuid := gen_random_uuid(); version_id uuid := gen_random_uuid(); extension text; base_path text;
begin
  select * into slot from public.deliverables where organization_id=org and id=(input->>'deliverable_id')::uuid for update;
  obligation := private.document_access(org,slot.obligation_id,actor,'upload');
  if obligation.disposition<>'active' or slot.review_state='aprobado' then perform private.fail('FORBIDDEN'); end if;
  if (input->>'expected_revision')::integer is distinct from slot.revision then perform private.fail('CONFLICT'); end if;
  select * into cycle from public.submission_cycles where organization_id=org and deliverable_id=slot.id and state in ('open','submitted') for update;
  if cycle.id is null or cycle.id is distinct from (input->>'cycle_id')::uuid then perform private.fail('CONFLICT'); end if;
  select value into specs from jsonb_array_elements(obligation.snapshot->'deliverables') where value->>'position_code'=slot.position_code;
  extension := lower(substring(input->>'original_name' from '\.([^.]+)$'));
  if extension is null or not specs->'allowed_formats' ? extension or coalesce((input->>'declared_bytes')::bigint,0)<=0
    or (input->>'declared_bytes')::bigint>(specs->>'max_file_bytes')::bigint then perform private.fail('VALIDATION_ERROR'); end if;
  base_path := org||'/'||obligation.id||'/'||slot.id||'/'||version_id||'.'||extension;
  insert into public.upload_intents(id,organization_id,deliverable_id,cycle_id,user_id,request_id,reserved_version_id,expected_deliverable_revision,original_name,declared_bytes,declared_mime,staging_path,final_path,created_by,updated_by)
    values(intent_id,org,slot.id,cycle.id,actor,req,version_id,slot.revision,input->>'original_name',(input->>'declared_bytes')::bigint,coalesce(input->>'declared_mime','application/octet-stream'),base_path,base_path,actor,actor);
  return jsonb_build_object('schema_version',1,'resource_id',intent_id,'upload_intent_id',intent_id,'revision',0,'status','reserved');
end $$;

create function private.review_document(org uuid, actor uuid, req uuid, op text, input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare slot public.deliverables; obligation public.obligations; cycle public.submission_cycles;
  decision text := case op when 'ApproveVersion' then 'approve' when 'ObserveVersion' then 'observe' else 'reopen' end;
  after_state text; event_id uuid; due_day date := (input->>'new_due_date')::date;
begin
  select * into slot from public.deliverables where organization_id=org and id=(input->>'deliverable_id')::uuid for update;
  obligation := private.document_access(org,slot.obligation_id,actor,decision);
  if obligation.disposition<>'active' then perform private.fail('FORBIDDEN'); end if;
  if (input->>'expected_revision')::integer is distinct from slot.revision or (input->>'version_id')::uuid is distinct from slot.current_version_id then perform private.fail('CONFLICT'); end if;
  if (decision='reopen' and slot.review_state<>'aprobado') or (decision<>'reopen' and slot.review_state<>'por_revisar') then perform private.fail('CONFLICT'); end if;
  if decision<>'approve' and (coalesce(btrim(input->>'comment'),'')='' or due_day is null or due_day<(now() at time zone 'America/Lima')::date) then perform private.fail('VALIDATION_ERROR'); end if;
  if decision='approve' and due_day is not null then perform private.fail('VALIDATION_ERROR'); end if;
  select * into cycle from public.submission_cycles where organization_id=org and deliverable_id=slot.id order by cycle_number desc limit 1 for update;
  after_state := case decision when 'approve' then 'aprobado' when 'observe' then 'observado' else 'pendiente' end;
  insert into public.review_events(organization_id,deliverable_id,version_id,reviewer_id,decision,comment,new_due_date,before_state,after_state,expected_revision,resulting_revision,request_id,created_by)
    values(org,slot.id,slot.current_version_id,actor,decision,nullif(btrim(input->>'comment'),''),due_day,slot.review_state,after_state,slot.revision,slot.revision+1,req,actor) returning id into event_id;
  update public.submission_cycles set state='closed',closed_at=now(),updated_at=now(),updated_by=actor,revision=revision+1 where id=cycle.id and state in ('open','submitted');
  if decision<>'approve' then
    insert into public.submission_cycles(organization_id,deliverable_id,cycle_number,reason,due_date,created_by,updated_by)
      values(org,slot.id,cycle.cycle_number+1,case decision when 'observe' then 'correction' else 'reopen' end,due_day,actor,actor);
  end if;
  update public.deliverables set current_version_id=case when decision='reopen' then null else current_version_id end,review_state=after_state,revision=revision+1,updated_at=now(),updated_by=actor where id=slot.id;
  update public.obligations set revision=revision+1,updated_at=now(),updated_by=actor where id=obligation.id;
  perform private.audit(org,actor,req,op,'deliverables',slot.id,to_jsonb(slot),(select to_jsonb(d) from public.deliverables d where id=slot.id));
  perform private.document_event(obligation,actor,case decision when 'approve' then 'approved' when 'observe' then 'observed' else 'reopened' end,'review:'||event_id,event_id,cycle.id);
  return jsonb_build_object('schema_version',1,'resource_id',slot.id,'revision',slot.revision+1,'status','completed');
end $$;

create function private.document_command(org uuid, actor uuid, req uuid, op text, input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare obligation public.obligations; version public.document_versions; target text; old_row jsonb; data jsonb; restoring boolean;
begin
  if op='SaveDocumentType' then
    perform private.assert_member(org,actor,true);
    return private.persist(org,actor,req,'document_types',input,array['code','name','module','category','description','suggested_formats','active']);
  end if;
  if op='ConfigureRequirement' then return private.configure_monthly(org,actor,req,input); end if;
  if op='GenerateMonthly' then return private.generate_monthly(org,actor,req,input); end if;
  if op='CreateUploadIntent' then return private.reserve_upload(org,actor,req,input); end if;
  if op in ('ApproveVersion','ObserveVersion','ReopenApproved') then return private.review_document(org,actor,req,op,input); end if;
  if op in ('DeleteDocumentEntity','RestoreDocumentEntity') then
    perform private.assert_member(org,actor,true); target := input->>'entity'; restoring := op='RestoreDocumentEntity';
    if target not in ('document_types','requirement_rules') then perform private.fail('VALIDATION_ERROR'); end if;
    execute format('select to_jsonb(t) from public.%I t where organization_id=$1 and id=$2 for update',target) into old_row using org,(input->>'id')::uuid;
    if old_row is null then perform private.fail('NOT_FOUND'); end if;
    if not restoring and coalesce(btrim(input->>'reason'),'')='' then perform private.fail('VALIDATION_ERROR'); end if;
    data := input||jsonb_build_object('deleted_at',case when restoring then null else now() end,'deleted_by',case when restoring then null else actor end,'deletion_reason',case when restoring then null else btrim(input->>'reason') end);
    if target='requirement_rules' then
      if restoring and not exists(select 1 from public.document_types where organization_id=org and id=(old_row->>'document_type_id')::uuid and deleted_at is null) then perform private.fail('FORBIDDEN'); end if;
      data := data||jsonb_build_object('operation_pauses',private.pause_intervals(old_row->'operation_pauses',not restoring or not (old_row->>'active')::boolean,'soft_delete',coalesce(input->>'reason','Restauración'),actor));
    end if;
    return private.persist(org,actor,req,target,data,array['deleted_at','deleted_by','deletion_reason','operation_pauses']);
  end if;
  if op='RequestDownload' then
    select * into version from public.document_versions where organization_id=org and id=(input->>'version_id')::uuid;
    obligation := private.document_access(org,(select obligation_id from public.deliverables where organization_id=org and id=version.deliverable_id),actor,'download');
    perform private.audit(org,actor,req,op,'document_versions',version.id,null,null);
    return jsonb_build_object('schema_version',1,'resource_id',version.id,'version_id',version.id,'revision',0,'status','authorized');
  end if;
  if op in ('SetNotApplicable','CancelObligation') then
    obligation := private.document_access(org,(input->>'obligation_id')::uuid,actor,case when op='SetNotApplicable' then 'waive' else 'view' end);
    if op='CancelObligation' then perform private.assert_member(org,actor,true); end if;
    if (input->>'expected_revision')::integer is distinct from obligation.revision then perform private.fail('CONFLICT'); end if;
    if obligation.disposition<>'active' or coalesce(btrim(input->>'reason'),'')='' then perform private.fail('VALIDATION_ERROR'); end if;
    update public.obligations set disposition=case when op='SetNotApplicable' then 'no_aplica' else 'cancelled' end,disposition_reason=btrim(input->>'reason'),revision=revision+1,updated_at=now(),updated_by=actor where id=obligation.id;
    update public.submission_cycles c set state='cancelled',closed_at=now(),revision=revision+1,updated_at=now(),updated_by=actor where c.organization_id=org and c.state in ('open','submitted') and c.deliverable_id in (select id from public.deliverables where organization_id=org and obligation_id=obligation.id);
    perform private.audit(org,actor,req,op,'obligations',obligation.id,to_jsonb(obligation),(select to_jsonb(o) from public.obligations o where id=obligation.id));
    return jsonb_build_object('schema_version',1,'resource_id',obligation.id,'revision',obligation.revision+1,'status','completed');
  end if;
  perform private.fail('VALIDATION_ERROR'); return null;
end $$;

create function public.h03_command(p_organization_id uuid,p_request_id uuid,p_operation text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
<<body>>
declare entry public.operation_requests; result jsonb; fingerprint text; error_code text;
begin
  perform 1 from public.organizations where id=p_organization_id for update;
  perform private.assert_member(p_organization_id,auth.uid()); perform private.admit_session(p_organization_id);
  if p_request_id is null or p_input is null or jsonb_typeof(p_input)<>'object' then perform private.fail('VALIDATION_ERROR'); end if;
  fingerprint := encode(extensions.digest(convert_to(p_input::text,'utf8'),'sha256'),'hex');
  insert into public.operation_requests(organization_id,request_id,actor_user_id,actor_key,operation,input_hash,created_by)
    values(p_organization_id,p_request_id,auth.uid(),'user:'||auth.uid(),p_operation,fingerprint,auth.uid()) on conflict do nothing;
  select * into entry from public.operation_requests where organization_id=p_organization_id and actor_key='user:'||auth.uid() and operation=p_operation and request_id=p_request_id for update;
  if entry.input_hash<>fingerprint then perform private.fail('CONFLICT'); end if;
  if entry.status='completed' then return jsonb_build_object('ok',true,'data',entry.result); end if;
  begin
    result := private.document_command(p_organization_id,auth.uid(),p_request_id,p_operation,p_input);
  exception when others then
    error_code := case when sqlstate in ('23505','40001','40P01') then 'CONFLICT' when sqlstate in ('23502','23503','23514','22P02','22007','22008','22023') then 'VALIDATION_ERROR'
      when sqlstate='P0001' and sqlerrm in ('FORBIDDEN','UNAUTHENTICATED','NOT_FOUND','CONFLICT','VALIDATION_ERROR') then sqlerrm else 'DEPENDENCY_UNAVAILABLE' end;
    update public.operation_requests set status='failed',error_code=body.error_code,revision=revision+1,updated_at=now() where id=entry.id;
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code',error_code));
  end;
  update public.operation_requests set status='completed',result=body.result,completed_at=now(),error_code=null,updated_at=now(),revision=revision+1 where id=entry.id;
  return jsonb_build_object('ok',true,'data',result);
exception when raise_exception then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',sqlerrm));
end $$;
revoke all on function private.document_access(uuid,uuid,uuid,text),private.document_event(public.obligations,uuid,text,text,uuid,uuid),
  private.configure_monthly(uuid,uuid,uuid,jsonb),private.generate_monthly(uuid,uuid,uuid,jsonb),private.reserve_upload(uuid,uuid,uuid,jsonb),
  private.review_document(uuid,uuid,uuid,text,jsonb),private.document_command(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.h03_command(uuid,uuid,text,jsonb) from public,anon;
grant execute on function public.h03_command(uuid,uuid,text,jsonb) to authenticated,service_role;
