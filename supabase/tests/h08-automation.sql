-- Local Docker only; every fixture and injected fault is rolled back.
begin;
\ir helpers/auth-session.psql
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();
create temporary table automation_fixture(organization_id uuid,company_id uuid,rule_id uuid,internal_rule_id uuid,stage_id uuid);
create function pg_temp.automation_command(org uuid,op text,input jsonb) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  r:=public.h03_command(org,gen_random_uuid(),op,input);
  if r->>'ok' is distinct from 'true' then raise exception 'Automation setup %: %',op,r; end if;
  return r->'data';
end $$;
do $$
declare
  actor uuid:=gen_random_uuid(); org uuid; company uuid; member uuid; role_id uuid; dtype uuid; worker uuid; stage uuid;
  rule uuid; internal_rule uuid; input jsonb; today date:=(now() at time zone 'America/Lima')::date; i integer;
begin
  insert into auth.users(id,email) values(actor,'automation-'||actor||'@example.test');
  insert into public.profiles(user_id,email,full_name,provisioning_status) values(actor,'automation-'||actor||'@example.test','Automation Docker','ready');
  for i in 1..2 loop
    insert into public.organizations(name) values('Automation Docker '||i) returning id into org;
    update public.organizations set settings=jsonb_set(settings,'{generation_local_time}','"00:00"') where id=org;
    insert into public.organization_members(organization_id,user_id,member_type,is_admin) values(org,actor,'internal',true) returning id into member;
    insert into public.companies(organization_id,ruc,legal_name,control_start_date) values(org,'20999999550','Automation company',today) returning id into company;
    insert into public.permissions(organization_id,module,action,description) select org,m,a,a
      from unnest(array['tributario','laboral_trabajador','actividades']) m cross join unnest(array['view','upload','approve','observe','reopen','download']) a;
    insert into public.roles(organization_id,code,name,audience) values(org,'automation','Automation','internal') returning id into role_id;
    insert into public.role_permissions(organization_id,role_id,permission_id) select org,role_id,id from public.permissions where organization_id=org;
    insert into public.access_grants(organization_id,member_id,scope,company_id,module,role_id)
      select org,member,'company',company,m,role_id from unnest(array['tributario','laboral_trabajador','actividades']) m;
    insert into public.access_grants(organization_id,member_id,scope,company_id,module,role_id) values(org,member,'organization',null,'actividades',role_id);
    insert into public.company_module_settings(organization_id,company_id,module,delivery_responsible_id) values(org,company,'tributario',actor);
    insert into public.workers(organization_id,company_id,identity_type,identity_number,first_names,last_names) values(org,company,'DNI','99999550','Automation','Worker') returning id into worker;
    stage:=gen_random_uuid();
    insert into public.employment_periods(id,organization_id,company_id,worker_id,sequence_number,start_date,end_date,termination_reason,document_generation)
    values(stage,org,company,worker,1,today,today,'renuncia',jsonb_build_object('schema_version',1,
      'hire',private.h05_generation_event(stage,'worker_hired',today,today),
      'termination',private.h05_generation_event(gen_random_uuid(),'worker_terminated',today,today),
      'reconcile',private.h05_generation_event(gen_random_uuid(),null,today,today)));
    perform pg_temp.authenticate(jsonb_build_object('sub',actor,'role','authenticated','session_id',gen_random_uuid())::text,true);
    dtype:=(pg_temp.automation_command(org,'SaveDocumentType','{"code":"automation","name":"Automation","module":"tributario","suggested_formats":["pdf"],"active":true}')->>'resource_id')::uuid;
    input:=jsonb_build_object('company_id',company,'document_type_id',dtype,'title','Automation daily','frequency','diaria','deadline_offset_days',0,
      'active',true,'allowed_formats','["pdf"]'::jsonb,'max_file_bytes',20000000,
      'deliverable_specs','[{"position_code":"file","label":"File","display_order":1,"allowed_formats":["pdf"],"max_file_bytes":20000000}]'::jsonb);
    rule:=(pg_temp.automation_command(org,'ConfigureRequirement',input)->>'resource_id')::uuid;
    input:=input-'document_type_id'||jsonb_build_object('company_id',null,'title','Automation internal','delivery_responsible_id',actor,'priority','alta');
    internal_rule:=(pg_temp.automation_command(org,'CreateAdditionalActivity',input)->>'rule_id')::uuid;
    update public.requirement_rules set generation_cursor=generation_cursor||jsonb_build_object('last_completed_end',(today-1)::text,'last_completed_occurrence',(today-1)::text) where id=internal_rule;
    insert into automation_fixture values(org,company,rule,internal_rule,stage);
  end loop;
end $$;
-- Give unrelated fixtures a later turn, solely inside this rolled-back test transaction.
insert into private.h08_generation_progress(organization_id,last_attempt_at,status)
select id,clock_timestamp()+interval '1 hour','idle' from public.organizations where id not in(select organization_id from automation_fixture)
on conflict(organization_id) do update set last_attempt_at=excluded.last_attempt_at;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select public.h08_generation_tick();
select public.h08_generation_tick();
select extensions.is((select count(*)::integer from public.obligations where rule_id in(select rule_id from automation_fixture)),2,'tick generates using rule IDs in both studies');
select extensions.ok(not exists(select 1 from public.employment_periods e join automation_fixture f on f.stage_id=e.id
  cross join lateral jsonb_each(e.document_generation) j where j.key<>'schema_version' and j.value->>'status'<>'completed'),'tick completes hire, termination and reconciliation by stage ID');
select public.h08_generation_tick();
select public.h08_generation_tick();
select extensions.ok(not exists(select 1 from public.requirement_rules r join automation_fixture f on f.internal_rule_id=r.id where private.h04_rule_pending(r,(now() at time zone 'America/Lima')::date)),'internal recurring rules also advance');
select extensions.is((select count(*)::integer from private.h08_generation_progress p join automation_fixture f on f.organization_id=p.organization_id where p.last_progress_at is not null),2,'durable progress rotates between studies');
select extensions.is((select count(*)::integer from public.obligations where rule_id in(select internal_rule_id from automation_fixture)),2,'reprocessing internal occurrences never duplicates obligations');

-- A failed cursor write is recorded by the engine and does not starve the next study.
update public.requirement_rules r set generation_cursor=generation_cursor||jsonb_build_object('last_completed_end',((now() at time zone 'America/Lima')::date-1)::text)
where r.id in(select rule_id from automation_fixture);
create function pg_temp.automation_fail() returns trigger language plpgsql as $$
begin
  if new.organization_id=current_setting('automation.failed_org')::uuid
    and new.generation_cursor is distinct from old.generation_cursor and new.generation_cursor->>'last_error' is null
    then raise exception 'Injected Docker failure'; end if;
  return new;
end $$;
select set_config('automation.failed_org',(select organization_id::text from automation_fixture limit 1),true);
create trigger automation_test_fail before update on public.requirement_rules for each row execute function pg_temp.automation_fail();
update private.h08_generation_progress set last_attempt_at='2001-01-01' where organization_id in(select organization_id from automation_fixture);
update private.h08_generation_progress set last_attempt_at='2000-01-01' where organization_id=current_setting('automation.failed_org')::uuid;
select extensions.is(public.h08_generation_tick()->>'status','failed','tick reports the engine failure rather than successful Cron');
select extensions.is(public.h08_health(current_setting('automation.failed_org')::uuid)->'data'->>'automation_failures','1','failed progress is observable outside Cron status');
select extensions.isnt(public.h08_generation_tick()->>'organization_id',current_setting('automation.failed_org'),'failed study does not monopolize the next tick');
drop trigger automation_test_fail on public.requirement_rules;
select extensions.is(public.h08_generation_tick()->>'status','completed','next turn recovers the failed page without duplicating documents');
select extensions.is(public.h08_health(current_setting('automation.failed_org')::uuid)->'data'->>'automation_failures','0','successful retry clears the persisted error');

insert into public.obligations(organization_id,class,company_id,module,period_id,document_type_id,destination_key,occurrence_key,manual_request_id,title,initial_due_date,assignment_issue,snapshot)
select o.organization_id,'documentary',o.company_id,o.module,o.period_id,o.document_type_id,o.destination_key,'automation-mass-'||n,gen_random_uuid(),'Automation unassigned',o.initial_due_date,true,o.snapshot
from public.obligations o join automation_fixture f on f.rule_id=o.rule_id cross join generate_series(1,105) n;
create temporary table automation_page as select public.h06_run_deadlines((now() at time zone 'America/Lima')::date,(select organization_id from automation_fixture limit 1),10) result;
select extensions.is((select (result->>'examined_obligations')::integer from automation_page),10,'deadline work is bounded by the requested page size');
select extensions.is((select result->>'has_more' from automation_page),'true','deadline backlog persists after the first page');
select extensions.ok(exists(select 1 from private.h06_deadline_progress p join automation_fixture f on f.organization_id=p.organization_id where p.last_obligation_id is not null),'deadline cursor is durable');
do $$ declare org uuid; page jsonb; i integer; begin
  for org in select organization_id from automation_fixture loop
    for i in 1..20 loop
      page:=public.h06_run_deadlines((now() at time zone 'America/Lima')::date,org,25);
      exit when page->>'has_more'='false';
    end loop;
  end loop;
end $$;
select extensions.is((select count(*)::integer from public.notification_events e join automation_fixture f on f.organization_id=e.organization_id where e.event_type='assignment_issue'),210,'all unassigned obligations eventually create one incident');
select public.h06_run_deadlines((now() at time zone 'America/Lima')::date,(select organization_id from automation_fixture limit 1),100);
select extensions.is((select count(*)::integer from public.notification_events e join automation_fixture f on f.organization_id=e.organization_id where e.event_type='assignment_issue'),210,'repeated scans do not duplicate incidents');
select extensions.ok(not has_function_privilege('authenticated','public.h06_run_deadlines(date,uuid,integer)','execute'),'browser cannot run the service deadline processor');
select extensions.ok(not has_table_privilege('authenticated','private.h06_deadline_progress','select'),'browser cannot inspect technical progress');
-- H05 deliberately returns pending WITH error_code after a recoverable phase failure.
-- Mock that public contract at its private port; rollback restores the original implementation.
create or replace function private.h05_process_employment(p_id uuid,p_actor uuid,p_request uuid,p_limit integer default 25) returns jsonb
language sql security definer set search_path='' as $$ select '{"status":"pending","error_code":"DEPENDENCY_UNAVAILABLE","generated_count":0}'::jsonb $$;
update public.employment_periods set document_generation=jsonb_set(document_generation,'{hire,status}','"pending"')
where id=(select stage_id from automation_fixture where organization_id=current_setting('automation.failed_org')::uuid);
update private.h08_generation_progress set last_attempt_at='2000-01-01' where organization_id=current_setting('automation.failed_org')::uuid;
create temporary table automation_old_progress as select last_progress_at from private.h08_generation_progress where organization_id=current_setting('automation.failed_org')::uuid;
select extensions.is(public.h08_generation_tick()->>'status','failed','retryable H05 pending error remains a visible failure');
select extensions.is((select last_progress_at from private.h08_generation_progress where organization_id=current_setting('automation.failed_org')::uuid),
  (select last_progress_at from automation_old_progress),'failed employment does not manufacture functional progress');
update private.h06_deadline_progress p set error_code='DEPENDENCY_UNAVAILABLE',failed_obligation_id=(select id from public.obligations where organization_id=p.organization_id limit 1)
where organization_id=current_setting('automation.failed_org')::uuid;
update public.companies set status='inactive' where organization_id=current_setting('automation.failed_org')::uuid;
select public.h06_run_deadlines((now() at time zone 'America/Lima')::date,current_setting('automation.failed_org')::uuid);
select extensions.ok((select error_code is null from private.h06_deadline_progress where organization_id=current_setting('automation.failed_org')::uuid),'a now non-operational resource releases its obsolete retry failure');
select * from extensions.finish();
rollback;
