create function private.h05_validate_employment(p_input jsonb,p_birth date) returns void
language plpgsql set search_path='' as $$
declare v_start date:=(p_input->>'start_date')::date; v_end date:=(p_input->>'end_date')::date; v_today date:=(now() at time zone 'America/Lima')::date;
begin
  if v_start is null or v_start>v_today or v_start<coalesce(p_birth,v_start) or v_end>v_today or v_end<v_start
    or ((v_end is null) is distinct from (nullif(p_input->>'termination_reason','') is null))
    or (p_input->>'termination_reason'='otro' and nullif(btrim(p_input->>'termination_notes'),'') is null)
    or (p_input->>'reference_salary' is not null and p_input->>'reference_salary' !~ '^[0-9]{1,12}(\.[0-9]{1,2})?$')
    or coalesce(p_input->>'currency','PEN') !~ '^[A-Z]{3}$'
    or length(coalesce(p_input->>'position',''))>150 or length(coalesce(p_input->>'department',''))>150
    or length(coalesce(p_input->>'contract_type',''))>100 or length(coalesce(p_input->>'termination_notes',''))>1000 then perform private.fail('VALIDATION_ERROR'); end if;
end $$;

create function private.h05_prepare_generation(p_stage public.employment_periods,p_control date,p_hire boolean,p_end boolean,p_reconcile boolean default false) returns jsonb
language plpgsql volatile set search_path='' as $$
declare v_state jsonb:=p_stage.document_generation; v_today date:=(now() at time zone 'America/Lima')::date;
  v_historical boolean:=p_stage.end_date is not null and p_stage.end_date<p_control;
begin
  if p_hire then v_state:=jsonb_set(v_state,'{hire}',private.h05_generation_event(p_stage.id,'worker_hired',p_stage.start_date,greatest(v_today,p_control,p_stage.start_date),v_historical)); end if;
  if p_end then v_state:=jsonb_set(v_state,'{termination}',private.h05_generation_event(coalesce((v_state->'termination'->>'event_id')::uuid,gen_random_uuid()),'worker_terminated',p_stage.end_date,p_stage.end_date,v_historical)); end if;
  if p_reconcile then v_state:=jsonb_set(v_state,'{reconcile}',private.h05_generation_event(gen_random_uuid(),null,v_today,greatest(v_today,p_control),v_historical)); end if;
  return v_state;
end $$;

create function private.h05_start_employment(p_org uuid,p_actor uuid,p_request uuid,p_worker public.workers,p_input jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_stage public.employment_periods; v_company public.companies;
begin
  v_company:=private.h05_company_access(p_org,p_worker.company_id,p_actor,'workers.manage');
  if p_worker.deleted_at is not null then perform private.fail('NOT_FOUND'); end if;
  perform private.h05_validate_employment(p_input,p_worker.birth_date);
  insert into public.employment_periods(organization_id,company_id,worker_id,sequence_number,start_date,end_date,termination_reason,termination_notes,position,department,contract_type,reference_salary,currency,created_by,updated_by)
    values(p_org,p_worker.company_id,p_worker.id,(select coalesce(max(sequence_number),0)+1 from public.employment_periods where organization_id=p_org and worker_id=p_worker.id),
      (p_input->>'start_date')::date,(p_input->>'end_date')::date,p_input->>'termination_reason',p_input->>'termination_notes',p_input->>'position',p_input->>'department',p_input->>'contract_type',
      (p_input->>'reference_salary')::numeric,coalesce(p_input->>'currency','PEN'),p_actor,p_actor) returning * into v_stage;
  update public.employment_periods set document_generation=private.h05_prepare_generation(v_stage,v_company.control_start_date,true,v_stage.end_date is not null) where id=v_stage.id;
  update public.workers set revision=revision+1,updated_at=now(),updated_by=p_actor where id=p_worker.id;
  perform private.audit(p_org,p_actor,p_request,'StartEmployment','employment_periods',v_stage.id,null,to_jsonb(v_stage));
  return v_stage.id;
end $$;

create function private.h05_worker_command(p_org uuid,p_actor uuid,p_request uuid,p_operation text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_worker public.workers; v_stage public.employment_periods; v_company public.companies; v_result jsonb; v_generation jsonb;
  v_input jsonb:=p_input; v_id uuid; v_before jsonb; v_today date:=(now() at time zone 'America/Lima')::date;
begin
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

alter function private.document_command(uuid,uuid,uuid,text,jsonb) rename to document_command_h04;
create function private.document_command(org uuid,actor uuid,req uuid,op text,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_item jsonb; v_type public.document_types; v_count integer:=0;
begin
  if op in ('RegisterWorker','UpdateWorker','StartEmployment','EndEmployment','CorrectEmployment','ReconcileEmployment','DeleteWorker','RestoreWorker') then
    return private.h05_worker_command(org,actor,req,op,input);
  end if;
  if op='ImportDocumentCatalog' then
    perform private.assert_member(org,actor,true);
    if jsonb_typeof(input->'templates')<>'array' or jsonb_array_length(input->'templates') not between 1 and 50 then perform private.fail('VALIDATION_ERROR'); end if;
    for v_item in select value from jsonb_array_elements(input->'templates') loop
      select * into v_type from public.document_types where organization_id=org and code=v_item->>'code';
      if v_type.id is not null then continue; end if;
      perform private.document_command_h04(org,actor,req,'SaveDocumentType',v_item||'{"active":true}'); v_count:=v_count+1;
    end loop;
    return jsonb_build_object('schema_version',1,'resource_id',org,'revision',0,'status','completed','generated_count',v_count);
  end if;
  return private.document_command_h04(org,actor,req,op,input);
end $$;
revoke all on function private.h05_validate_employment(jsonb,date),private.h05_prepare_generation(public.employment_periods,date,boolean,boolean,boolean),
  private.h05_start_employment(uuid,uuid,uuid,public.workers,jsonb),private.h05_worker_command(uuid,uuid,uuid,text,jsonb),private.document_command_h04(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;

