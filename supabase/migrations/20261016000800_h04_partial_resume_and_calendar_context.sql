-- A paused partial occurrence resumes its pinned destinations before the cursor advances.
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
  if v_first is null then
    select id into v_first from public.obligations where organization_id=v_rule.organization_id and rule_id=v_rule.id
      and occurrence_key=coalesce(v_period->>'key',v_cursor->>'last_completed_occurrence') order by destination_key limit 1;
  end if;
  return jsonb_build_object('schema_version',1,'resource_id',coalesce(v_first,v_rule.id),'obligation_id',v_first,
    'revision',(select revision from public.requirement_rules where id=v_rule.id),'status',case when v_pending then 'pending' else 'completed' end,
    'generated_count',v_generated,'processed_count',v_processed,'has_more',coalesce(v_pending,false),'warning',v_warning);
end $$;


alter function private.h04_calendar(text,date,date,integer,text,text) set DateStyle='ISO, YMD';
alter function private.h04_calendar(text,date,date,integer,text,text) set TimeZone='America/Lima';
alter function private.h04_anchor_month(date,integer) set TimeZone='America/Lima';
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
    and (p_rule_id is not null or exists(select 1 from public.requirement_rules r join public.companies c on c.id=r.company_id join public.document_types d on d.id=r.document_type_id
      where r.organization_id=o.id and c.deleted_at is null and c.status='active' and d.deleted_at is null and d.active and private.h04_rule_pending(r,v_today))
      or exists(select 1 from public.obligations b join public.companies c on c.id=b.company_id where b.organization_id=o.id and b.disposition='active' and c.status='active' and c.deleted_at is null
        and b.assignment_issue is distinct from (b.delivery_responsible_id is null or not private.has_permission(o.id,b.delivery_responsible_id,b.company_id,b.module,'upload'))))
    order by o.id limit 1 for update of o skip locked;
  if v_org is null then return jsonb_build_object('ok',true,'status','idle'); end if;
  select r.* into v_rule from public.requirement_rules r join public.companies c on c.id=r.company_id join public.document_types d on d.id=r.document_type_id
    where r.organization_id=v_org and (p_rule_id is null or r.id=p_rule_id) and c.deleted_at is null and c.status='active' and d.deleted_at is null and d.active
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
revoke all on function public.h04_run_generation(uuid,integer) from public,anon,authenticated;
grant execute on function public.h04_run_generation(uuid,integer) to service_role;


