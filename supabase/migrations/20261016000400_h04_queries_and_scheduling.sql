alter function public.h03_query(uuid,text,jsonb) rename to h03_query_legacy;
alter function public.h03_query_legacy(uuid,text,jsonb) set schema private;
revoke all on function private.h03_query_legacy(uuid,text,jsonb) from public,anon,authenticated;
create function public.h03_query(p_organization_id uuid,p_resource text,p_input jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_result jsonb; v_start integer:=greatest(coalesce((p_input->>'page')::integer,1)-1,0)*25;
begin
  if p_resource not in ('rules','responsibles') then return private.h03_query_legacy(p_organization_id,p_resource,p_input); end if;
  perform private.assert_member(p_organization_id,auth.uid(),true); perform private.admit_session(p_organization_id);
  if p_resource='rules' then
    with visible as (select r.*,c.legal_name company_name,to_jsonb(v) configuration,
      (select to_jsonb(a) from public.rule_versions a where a.organization_id=r.organization_id and a.rule_id=r.id
        and a.effective_from<=(now() at time zone 'America/Lima')::date order by a.effective_from desc,a.version_number desc limit 1) effective_configuration
      from public.requirement_rules r join public.companies c on c.id=r.company_id and c.organization_id=r.organization_id
      left join public.rule_versions v on v.id=r.current_version_id
      where r.organization_id=p_organization_id and (coalesce((p_input->>'include_deleted')::boolean,false) or (r.deleted_at is null and c.deleted_at is null))
        and (p_input->>'company_id' is null or r.company_id=(p_input->>'company_id')::uuid))
    select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from visible order by created_at desc,id offset v_start limit 25) x),'[]'),
      'count',(select count(*) from visible)) into v_result;
  else
    with eligible as (select p.user_id,p.full_name from public.profiles p join public.organization_members m on m.user_id=p.user_id and m.organization_id=p_organization_id
      where private.has_permission(p_organization_id,p.user_id,(p_input->>'company_id')::uuid,p_input->>'module','upload'))
    select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from eligible order by full_name,user_id offset v_start limit 25) x),'[]'),
      'count',(select count(*) from eligible)) into v_result;
  end if;
  return jsonb_build_object('ok',true,'data',v_result);
exception when raise_exception then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',sqlerrm));
end $$;
revoke all on function public.h03_query(uuid,text,jsonb) from public,anon;
grant execute on function public.h03_query(uuid,text,jsonb) to authenticated;

create function public.h04_preview(p_organization_id uuid,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_period jsonb; v_day date:=coalesce((nullif(p_input->>'reference_date',''))::date,(now() at time zone 'America/Lima')::date); v_due date;
begin
  perform private.assert_member(p_organization_id,auth.uid(),true); perform private.admit_session(p_organization_id);
  v_period:=private.h04_calendar(p_input->>'frequency',v_day,(nullif(p_input->>'anchor_date',''))::date,(p_input->>'interval_count')::integer,p_input->>'interval_unit','preview');
  v_due:=(v_period->>'end_date')::date+coalesce((p_input->>'deadline_offset_days')::integer,0);
  return jsonb_build_object('ok',true,'data',v_period||jsonb_build_object('due_date',v_due,'overdue',v_due<(now() at time zone 'America/Lima')::date));
exception when others then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',case when sqlstate='P0001' and sqlerrm in ('FORBIDDEN','UNAUTHENTICATED') then sqlerrm else 'VALIDATION_ERROR' end));
end $$;
revoke all on function public.h04_preview(uuid,jsonb) from public,anon;
grant execute on function public.h04_preview(uuid,jsonb) to authenticated;

create function private.h04_rule_pending(p_rule public.requirement_rules,p_today date) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare v_config public.rule_versions; v_reference date;
begin
  if not p_rule.active or p_rule.deleted_at is not null or p_rule.control_start_date>p_today then return false; end if;
  if p_rule.generation_cursor->>'processing_occurrence' is not null then return true; end if;
  v_reference:=greatest(p_rule.control_start_date,coalesce((p_rule.generation_cursor->>'last_completed_end')::date+1,p_rule.control_start_date));
  select * into v_config from public.rule_versions where organization_id=p_rule.organization_id and rule_id=p_rule.id and effective_from<=v_reference order by effective_from desc,version_number desc limit 1;
  if v_config.id is null or v_config.frequency='eventual' then return false; end if;
  if v_config.frequency='unica' then return p_rule.generation_cursor->>'last_completed_occurrence' is null; end if;
  if v_config.frequency='personalizada' and v_config.anchor_date>p_today then return false; end if;
  return v_reference<=p_today;
end $$;

create function private.h04_reconcile_assignments(p_org uuid,p_limit integer) returns integer
language plpgsql security definer set search_path='' as $$
declare v_obligation public.obligations; v_issue boolean; v_count integer:=0;
begin
  for v_obligation in select o.* from public.obligations o join public.companies c on c.id=o.company_id and c.organization_id=o.organization_id
    where o.organization_id=p_org and o.disposition='active' and c.status='active' and c.deleted_at is null
      and o.assignment_issue is distinct from (o.delivery_responsible_id is null or not private.has_permission(p_org,o.delivery_responsible_id,o.company_id,o.module,'upload'))
    order by o.id limit p_limit for update of o skip locked loop
    v_issue:=v_obligation.delivery_responsible_id is null or not private.has_permission(p_org,v_obligation.delivery_responsible_id,v_obligation.company_id,v_obligation.module,'upload');
    update public.obligations set assignment_issue=v_issue,revision=revision+1,updated_at=now(),updated_by=null where id=v_obligation.id;
    perform private.h04_audit(p_org,null,gen_random_uuid(),'RefreshAssignment','obligations',v_obligation.id,to_jsonb(v_obligation),jsonb_build_object('assignment_issue',v_issue));
    if v_issue then perform private.h04_assignment_event((select o from public.obligations o where id=v_obligation.id),null,'assignment_issue','assignment_issue:'||v_obligation.id||':'||(v_obligation.revision+1)); end if;
    v_count:=v_count+1;
  end loop;
  return v_count;
end $$;

create function public.h04_run_generation(p_rule_id uuid default null,p_batch_size integer default 50) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_org uuid; v_rule public.requirement_rules; v_result jsonb:='{}'; v_assignments integer; v_today date:=(now() at time zone 'America/Lima')::date;
begin
  if auth.role() is distinct from 'service_role' and session_user<>'postgres' then perform private.fail('FORBIDDEN'); end if;
  if p_batch_size not between 1 and 100 then perform private.fail('VALIDATION_ERROR'); end if;
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

create function public.h04_schedule_generation(p_enabled boolean default true) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.role() is distinct from 'service_role' then perform private.fail('FORBIDDEN'); end if;
  if p_enabled then
    perform cron.schedule('h04-generation-day','5 5 * * *','select public.h04_run_generation();');
    perform cron.schedule('h04-generation-continuation','* * * * *','select public.h04_run_generation();');
  else
    perform cron.unschedule(jobid) from cron.job where jobname in ('h04-generation-day','h04-generation-continuation');
  end if;
end $$;
revoke all on function public.h04_schedule_generation(boolean) from public,anon,authenticated;
grant execute on function public.h04_schedule_generation(boolean) to service_role;

-- New internal helpers never become alternative browser mutation entry points.
do $$ declare v_proc record; begin
  for v_proc in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='private' and (p.proname like 'h04_%' or p.proname='document_command_h03') loop
    execute format('revoke all on function %s from public,anon,authenticated',v_proc.signature);
  end loop;
end $$;
