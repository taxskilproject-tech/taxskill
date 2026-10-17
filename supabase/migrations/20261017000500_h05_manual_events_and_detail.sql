create or replace function public.h05_query(p_organization_id uuid,p_resource text,p_input jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_company public.companies; v_worker public.workers; v_stage public.employment_periods; v_member public.organization_members; v_result jsonb;
  v_start integer:=least(greatest(coalesce((p_input->>'page')::integer,1)-1,0),100000)*25;
  v_deleted boolean:=coalesce((p_input->>'include_deleted')::boolean,false); v_status text:=coalesce(p_input->>'status','all'); v_q text:=lower(coalesce(p_input->>'q',''));
begin
  v_member:=private.assert_member(p_organization_id,auth.uid()); perform private.admit_session(p_organization_id);
  v_company:=private.h05_company_access(p_organization_id,(p_input->>'company_id')::uuid,auth.uid(),'view');
  if v_deleted and not v_member.is_admin then perform private.fail('FORBIDDEN'); end if;
  if p_resource='workers' then
    with visible as(select w.id,w.company_id,w.identity_type,w.identity_number,w.first_names,w.last_names,w.revision,w.deleted_at,w.deletion_reason,
      case when exists(select 1 from public.employment_periods e where e.worker_id=w.id and e.end_date is null) then 'active'
        when exists(select 1 from public.employment_periods e where e.worker_id=w.id) then 'ended' else 'unregistered' end employment_status
      from public.workers w where w.organization_id=p_organization_id and w.company_id=v_company.id and (v_deleted or w.deleted_at is null)
        and (v_q='' or position(v_q in lower(w.first_names||' '||w.last_names||' '||w.identity_number))>0)), filtered as(select * from visible where v_status='all' or employment_status=v_status)
    select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from filtered order by last_names,first_names,id offset v_start limit 25) r),'[]'),
      'count',(select count(*) from filtered)) into v_result;
  elsif p_resource='worker' then
    select * into v_worker from public.workers where organization_id=p_organization_id and company_id=v_company.id and id=(p_input->>'worker_id')::uuid and (deleted_at is null or v_member.is_admin);
    if v_worker.id is null then perform private.fail('NOT_FOUND'); end if;
    if p_input->>'employment_period_id' is not null then
      select * into v_stage from public.employment_periods where organization_id=p_organization_id and company_id=v_company.id and worker_id=v_worker.id and id=(p_input->>'employment_period_id')::uuid;
      if v_stage.id is null then perform private.fail('NOT_FOUND'); end if;
    else select * into v_stage from public.employment_periods where organization_id=p_organization_id and worker_id=v_worker.id order by (end_date is null) desc,sequence_number desc limit 1; end if;
    v_result:=jsonb_build_object('worker',to_jsonb(v_worker),'company_name',v_company.legal_name,'company_status',v_company.status,
      'selected_period',case when v_stage.id is not null then to_jsonb(v_stage)||jsonb_build_object('reference_salary',v_stage.reference_salary::text) else 'null'::jsonb end,
      'period_rows',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (select id,sequence_number,start_date,end_date,revision from public.employment_periods where organization_id=p_organization_id and worker_id=v_worker.id order by sequence_number desc offset v_start limit 25) r),
      'has_open_period',exists(select 1 from public.employment_periods where organization_id=p_organization_id and worker_id=v_worker.id and end_date is null),
      'period_count',(select count(*) from public.employment_periods where organization_id=p_organization_id and worker_id=v_worker.id));
  elsif p_resource='event_rules' then
    if not exists(select 1 from public.employment_periods e join public.workers w on w.id=e.worker_id where e.organization_id=p_organization_id and e.company_id=v_company.id and e.worker_id=(p_input->>'worker_id')::uuid and e.id=(p_input->>'employment_period_id')::uuid and w.deleted_at is null) then perform private.fail('NOT_FOUND'); end if;
    with visible as(select r.id,r.title from public.requirement_rules r join public.document_types d on d.id=r.document_type_id
      join lateral(select * from public.rule_versions v where v.rule_id=r.id and v.effective_from<=(now() at time zone 'America/Lima')::date order by v.effective_from desc,v.version_number desc limit 1) v on true
      where r.organization_id=p_organization_id and r.company_id=v_company.id and r.module='laboral_trabajador' and r.active and r.deleted_at is null and d.active and d.deleted_at is null
        and (r.employment_period_id is null or r.employment_period_id=(p_input->>'employment_period_id')::uuid) and v.frequency='eventual' and v.applicability_conditions->'event_types' ? 'manual_request')
    select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r)) from(select * from visible order by title,id offset v_start limit 25)r),'[]'),'count',(select count(*)from visible)) into v_result;
  else perform private.fail('VALIDATION_ERROR'); end if;
  return jsonb_build_object('ok',true,'data',v_result);
exception when others then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',case when sqlstate='P0001' and sqlerrm in ('FORBIDDEN','NOT_FOUND','UNAUTHENTICATED') then sqlerrm else 'VALIDATION_ERROR' end));
end $$;
revoke all on function public.h05_query(uuid,text,jsonb) from public,anon;
grant execute on function public.h05_query(uuid,text,jsonb) to authenticated;

create function private.h05_manual_event(p_org uuid,p_actor uuid,p_request uuid,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_stage public.employment_periods; v_rule public.requirement_rules;
begin
  perform private.h05_company_access(p_org,(p_input->>'company_id')::uuid,p_actor,'workers.manage');
  perform 1 from public.workers where organization_id=p_org and company_id=(p_input->>'company_id')::uuid and id=(p_input->>'worker_id')::uuid and deleted_at is null for update;
  if not found then perform private.fail('NOT_FOUND'); end if;
  select * into v_stage from public.employment_periods where organization_id=p_org and company_id=(p_input->>'company_id')::uuid and worker_id=(p_input->>'worker_id')::uuid and id=(p_input->>'employment_period_id')::uuid for update;
  if v_stage.id is null then perform private.fail('NOT_FOUND'); end if;
  if v_stage.revision is distinct from (p_input->>'expected_revision')::integer then perform private.fail('CONFLICT'); end if;
  select * into v_rule from public.requirement_rules where organization_id=p_org and company_id=v_stage.company_id and id=(p_input->>'rule_id')::uuid and module='laboral_trabajador' for update;
  if v_rule.id is null then perform private.fail('NOT_FOUND'); end if;
  if (p_input->>'event_id')::uuid is null or (p_input->>'reference_date')::date is null or (p_input->>'reference_date')::date>(now() at time zone 'America/Lima')::date then perform private.fail('VALIDATION_ERROR'); end if;
  return private.h04_generate(v_rule.id,p_actor,p_request,(now() at time zone 'America/Lima')::date,1,
    jsonb_build_object('event_id',p_input->>'event_id','event_type','manual_request','reference_date',p_input->>'reference_date','employment_period_id',v_stage.id));
end $$;
revoke all on function private.h05_manual_event(uuid,uuid,uuid,jsonb) from public,anon,authenticated;


create or replace function private.document_command(org uuid,actor uuid,req uuid,op text,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_item jsonb; v_type public.document_types; v_count integer:=0;
begin
  if op='EmitEmploymentRequest' then return private.h05_manual_event(org,actor,req,input); end if;
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


