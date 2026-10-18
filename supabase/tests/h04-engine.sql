-- Synthetic fixtures exclusively in Docker TaxSkill. Always roll back.
begin;
\ir helpers/auth-session.psql
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();
select extensions.is(private.h04_calendar('diaria','2026-01-01')->>'key','2026-01-01','Daily civil key');
select extensions.is(private.h04_calendar('semanal','2021-01-01')->>'key','2020-W53','ISO week-year crosses calendar year');
select extensions.is(private.h04_calendar('semanal','2021-01-01')->>'start_date','2020-12-28','ISO week starts Monday');
select extensions.is(private.h04_calendar('semanal','2021-01-01')->>'end_date','2021-01-03','ISO week ends Sunday');
select extensions.is(private.h04_calendar('quincenal','2024-02-15')->>'key','2024-02-Q1','First fortnight includes day 15');
select extensions.is(private.h04_calendar('quincenal','2024-02-16')->>'start_date','2024-02-16','Second fortnight starts day 16');
select extensions.is(private.h04_calendar('quincenal','2024-02-16')->>'end_date','2024-02-29','Leap-year second fortnight');
select extensions.is(private.h04_calendar('quincenal','2023-02-16')->>'end_date','2023-02-28','Non-leap second fortnight');
select extensions.is(private.h04_calendar('mensual','2024-02-16')->>'end_date','2024-02-29','Leap February monthly end');
select extensions.is(private.h04_calendar('mensual','2026-12-31')->>'key','2026-12','December key');
select extensions.is(private.h04_calendar('trimestral','2026-03-31')->>'end_date','2026-03-31','Quarter closes March 31');
select extensions.is(private.h04_calendar('trimestral','2026-04-01')->>'start_date','2026-04-01','Next quarter opens April 1');
select extensions.is(private.h04_calendar('semestral','2026-06-30')->>'end_date','2026-06-30','First half-year');
select extensions.is(private.h04_calendar('semestral','2026-07-01')->>'start_date','2026-07-01','Second half-year');
select extensions.is(private.h04_calendar('anual','2024-02-29')->>'end_date','2024-12-31','Leap annual end');
select extensions.is(private.h04_calendar('personalizada','2024-02-29','2024-01-31',1,'months')->>'start_date','2024-02-29','Monthly anchor clamps to leap February');
select extensions.is(private.h04_calendar('personalizada','2024-03-30','2024-01-31',1,'months')->>'start_date','2024-02-29','Clamped cycle remains until original anchor day');
select extensions.is(private.h04_calendar('personalizada','2024-03-31','2024-01-31',1,'months')->>'start_date','2024-03-31','Monthly anchor returns to day 31');
select extensions.is(private.h04_calendar('personalizada','2023-03-31','2023-01-31',1,'months')->>'start_date','2023-03-31','Anchor also returns after non-leap February');
select extensions.is(private.h04_calendar('personalizada','2026-01-04','2026-01-01',3,'days')->>'end_date','2026-01-06','Every three days');
select extensions.is(private.h04_calendar('personalizada','2026-01-02','2025-12-28',2,'weeks')->>'end_date','2026-01-10','Two-week anchor crosses year');
select extensions.is(private.h04_calendar('unica','2026-01-01','2026-03-01',null,null,'stable')->>'key','unique:stable','Single occurrence has stable identity');
select extensions.is(private.h04_calendar('eventual','2026-01-01',null,null,null,'event-1')->>'key','event:event-1','Event key requires stable source identity');
select extensions.throws_ok($$select private.h04_calendar('personalizada','2026-01-01','2026-01-01',0,'days')$$,'P0001','VALIDATION_ERROR','Zero interval rejected');
select extensions.throws_ok($$select private.h04_calendar('personalizada','2026-01-01','2026-01-01',-1,'months')$$,'P0001','VALIDATION_ERROR','Negative interval rejected');
select extensions.throws_ok($$select private.h04_calendar('personalizada','2026-01-01','2026-01-01',1,null)$$,'P0001','VALIDATION_ERROR','Missing interval unit rejected');
select extensions.throws_ok($$select private.h04_calendar('eventual','2026-01-01')$$,'P0001','VALIDATION_ERROR','Event without identity rejected');
set local datestyle='SQL, DMY';
select extensions.is(private.h04_calendar('diaria',make_date(2026,10,16))->>'key','2026-10-16','Calendar keys remain ISO regardless of connection DateStyle');
set local datestyle='ISO, YMD';

create function pg_temp.expect(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'H04 acceptance failed: %',label; end if; end $$;
create function pg_temp.command(org uuid,op text,input jsonb,req uuid default gen_random_uuid()) returns jsonb language plpgsql as $$
declare response jsonb;
begin response:=public.h03_command(org,req,op,input); if not coalesce((response->>'ok')::boolean,false) then raise exception 'H04 %: %',op,response; end if; return response->'data'; end $$;

create function pg_temp.fail_h04_batch() returns trigger language plpgsql as $$
begin
  if current_setting('h04.fail_batch',true)='yes' then raise exception 'Injected local batch failure'; end if;
  return new;
end $$;
create trigger h04_test_partial_failure before insert on public.deliverables for each row execute function pg_temp.fail_h04_batch();

do $$
declare v_org uuid:=gen_random_uuid(); v_actor uuid:=gen_random_uuid(); v_client uuid:=gen_random_uuid(); v_member uuid; v_role uuid; v_company uuid;
  v_type uuid; v_worker_type uuid; v_rule uuid; v_daily uuid; v_worker_rule uuid; v_event_rule uuid; v_single uuid;
  v_input jsonb; v_result jsonb; v_original jsonb; v_old_version uuid; v_obligation uuid; v_revision integer; v_cursor jsonb;
  v_today date:=(now() at time zone 'America/Lima')::date; v_next date; v_worker uuid; v_employment uuid; v_event uuid:=gen_random_uuid();
  v_count integer; v_request uuid:=gen_random_uuid(); v_settings uuid; v_event_input jsonb;
begin
  insert into auth.users(id,email) values(v_actor,'h04-a-'||v_actor||'@example.test'),(v_client,'h04-c-'||v_client||'@example.test');
  insert into public.profiles(user_id,email,full_name,provisioning_status) select id,email,'H04 SQL fixture','ready' from auth.users where id in(v_actor,v_client);
  insert into public.organizations(id,name) values(v_org,'H04 Docker SQL');
  insert into public.organization_members(organization_id,user_id,member_type,is_admin) values(v_org,v_actor,'internal',true);
  insert into public.organization_members(organization_id,user_id,member_type) values(v_org,v_client,'client') returning id into v_member;
  insert into public.companies(organization_id,ruc,legal_name,control_start_date) values(v_org,'20999999777','H04 SQL company',v_today) returning id into v_company;
  insert into public.roles(organization_id,code,name,audience) values(v_org,'h04_client','H04 client','client') returning id into v_role;
  insert into public.permissions(organization_id,module,action,description) select v_org,m,a,a from unnest(array['tributario','laboral_general','laboral_trabajador']) m cross join unnest(array['view','upload','download']) a;
  insert into public.role_permissions(organization_id,role_id,permission_id) select v_org,v_role,id from public.permissions where organization_id=v_org;
  insert into public.access_grants(organization_id,member_id,scope,company_id,module,role_id) select v_org,v_member,'company',v_company,m,v_role from unnest(array['tributario','laboral_general','laboral_trabajador']) m;
  insert into public.company_module_settings(organization_id,company_id,module,delivery_responsible_id) select v_org,v_company,m,v_client from unnest(array['tributario','laboral_general','laboral_trabajador']) m;
  perform pg_temp.authenticate(jsonb_build_object('sub',v_actor,'role','authenticated','session_id',gen_random_uuid())::text,true);
  perform pg_temp.expect((public.h02_context()->>'ok')::boolean,'actor admitted');
  v_type:=(pg_temp.command(v_org,'SaveDocumentType','{"code":"h04_company","name":"H04 Company","module":"tributario","suggested_formats":["pdf"],"active":true}')->>'resource_id')::uuid;
  v_worker_type:=(pg_temp.command(v_org,'SaveDocumentType','{"code":"h04_worker","name":"H04 Worker","module":"laboral_trabajador","suggested_formats":["pdf"],"active":true}')->>'resource_id')::uuid;
  v_input:=jsonb_build_object('company_id',v_company,'document_type_id',v_type,'title','Monthly original','frequency','mensual','deadline_offset_days',-30,'active',true,'allowed_formats',jsonb_build_array('pdf'),'max_file_bytes',20000000,
    'deliverable_specs','[{"position_code":"file_1","label":"Original position","display_order":1,"allowed_formats":["pdf"],"max_file_bytes":20000000}]'::jsonb);
  v_rule:=(pg_temp.command(v_org,'ConfigureRequirement',v_input,v_request)->>'resource_id')::uuid;
  perform pg_temp.expect((pg_temp.command(v_org,'ConfigureRequirement',v_input,v_request)->>'resource_id')::uuid=v_rule,'configuration retry');
  v_result:=pg_temp.command(v_org,'GenerateRule',jsonb_build_object('rule_id',v_rule));
  v_obligation:=(v_result->>'resource_id')::uuid;
  perform pg_temp.expect(v_result->>'warning' is not null,'overdue onboarding warning without deadline shift');
  perform pg_temp.command(v_org,'GenerateRule',jsonb_build_object('rule_id',v_rule));
  perform pg_temp.expect((select count(*)=1 from public.obligations where rule_id=v_rule),'one current period, no backfill before onboarding');
  select snapshot,rule_version_id into v_original,v_old_version from public.obligations where id=v_obligation;
  select revision into v_revision from public.requirement_rules where id=v_rule;
  v_result:=pg_temp.command(v_org,'ConfigureRequirement',v_input||jsonb_build_object('id',v_rule,'expected_revision',v_revision,'title','Monthly future','deadline_offset_days',5,'allowed_formats',jsonb_build_array('pdf','png')));
  v_next:=(v_result->>'effective_from')::date;
  perform pg_temp.expect(v_next=(date_trunc('month',v_today)+interval '1 month')::date,'next unstarted cycle is default effective date');
  perform pg_temp.expect((select snapshot=v_original from public.obligations where id=v_obligation),'existing snapshot unchanged');
  perform pg_temp.expect((select configuration_snapshot->>'title'='Monthly original' from public.rule_versions where id=v_old_version),'version freezes title');
  v_result:=public.h03_command(v_org,gen_random_uuid(),'ConfigureRequirement',v_input||jsonb_build_object('id',v_rule,'expected_revision',v_revision));
  perform pg_temp.expect(v_result->'error'->>'code'='CONFLICT','stale second editor rejected');
  perform private.h04_generate(v_rule,v_actor,gen_random_uuid(),v_next,50);
  perform pg_temp.expect((select count(*)=2 from public.obligations where rule_id=v_rule),'future version does not duplicate current period');
  perform pg_temp.expect(exists(select 1 from public.obligations where rule_id=v_rule and title='Monthly future' and rule_version_id<>v_old_version),'new occurrence takes new version');

  v_daily:=(pg_temp.command(v_org,'ConfigureRequirement',v_input||'{"title":"Daily recovery","frequency":"diaria","deadline_offset_days":0}')->>'resource_id')::uuid;
  perform private.h04_generate(v_daily,v_actor,gen_random_uuid(),v_today,1);
  v_result:=private.h04_generate(v_daily,v_actor,gen_random_uuid(),v_today+4,2);
  perform pg_temp.expect((v_result->>'has_more')::boolean,'bounded catch-up exposes continuation');
  perform private.h04_generate(v_daily,v_actor,gen_random_uuid(),v_today+4,2);
  perform pg_temp.expect((select count(*)=5 from public.obligations where rule_id=v_daily),'technical outage catches every missing day');
  update public.requirement_rules set operation_pauses=jsonb_build_array(jsonb_build_object('paused_from',v_today+5,'resumed_on',v_today+8,'reason','Administrative fixture','actor_id',v_actor,'cause','rule_paused')) where id=v_daily;
  perform private.h04_generate(v_daily,v_actor,gen_random_uuid(),v_today+8,50);
  perform pg_temp.expect((select count(*)=6 from public.obligations where rule_id=v_daily),'pause excludes three days and resumes current day');
  perform pg_temp.expect(not exists(select 1 from public.obligations where rule_id=v_daily and occurrence_key in ((v_today+5)::text,(v_today+6)::text,(v_today+7)::text)),'paused occurrences not emitted');

  for i in 1..5 loop
    insert into public.workers(organization_id,company_id,identity_type,identity_number,first_names,last_names) values(v_org,v_company,'OTHER','H04-'||i,'Worker',i::text) returning id into v_worker;
    insert into public.employment_periods(organization_id,company_id,worker_id,sequence_number,start_date) values(v_org,v_company,v_worker,1,v_today) returning id into v_employment;
  end loop;
  v_worker_rule:=(pg_temp.command(v_org,'ConfigureRequirement',v_input||jsonb_build_object('title','Worker batches','document_type_id',v_worker_type))->>'resource_id')::uuid;
  v_result:=private.h04_generate(v_worker_rule,v_actor,gen_random_uuid(),v_today,2);
  perform pg_temp.expect((v_result->>'has_more')::boolean and (select generation_cursor->>'last_completed_occurrence' is null from public.requirement_rules where id=v_worker_rule),'first worker batch does not complete occurrence');
  select generation_cursor,revision into v_cursor,v_revision from public.requirement_rules where id=v_worker_rule;
  perform pg_temp.command(v_org,'ConfigureRequirement',v_input||jsonb_build_object('id',v_worker_rule,'expected_revision',v_revision,'document_type_id',v_worker_type,'title','Future workers'));
  perform set_config('h04.fail_batch','yes',true);
  v_result:=public.h03_command(v_org,gen_random_uuid(),'GenerateRule',jsonb_build_object('rule_id',v_worker_rule,'batch_size',2));
  perform pg_temp.expect(v_result->'error'->>'code'='DEPENDENCY_UNAVAILABLE','injected second batch reports explicit error');
  perform pg_temp.expect((select count(*)=2 from public.obligations where rule_id=v_worker_rule),'failed batch leaves no partial obligations');
  perform pg_temp.expect((select generation_cursor->>'next_destination_key'=v_cursor->>'next_destination_key' and generation_cursor->>'rule_version_id'=v_cursor->>'rule_version_id' and generation_cursor->>'last_error'='DEPENDENCY_UNAVAILABLE' from public.requirement_rules where id=v_worker_rule),'failed batch preserves committed cursor and records error');
  perform set_config('h04.fail_batch','no',true);
  perform private.h04_generate(v_worker_rule,v_actor,gen_random_uuid(),v_today,2);
  perform private.h04_generate(v_worker_rule,v_actor,gen_random_uuid(),v_today,2);
  perform pg_temp.expect((select count(*)=5 and count(distinct rule_version_id)=1 and count(distinct title)=1 from public.obligations where rule_id=v_worker_rule),'resumed batches keep version and title despite concurrent configuration');
  perform pg_temp.expect((select generation_cursor->>'processing_occurrence' is null and generation_cursor->>'last_completed_occurrence' is not null from public.requirement_rules where id=v_worker_rule),'cursor completes after all destinations');
  perform pg_temp.expect((select count(*)=5 from public.deliverables d join public.obligations o on o.id=d.obligation_id where o.rule_id=v_worker_rule),'every emitted worker has all required positions');
  v_worker_rule:=(pg_temp.command(v_org,'ConfigureRequirement',v_input||jsonb_build_object('title','Partial paused occurrence','document_type_id',v_worker_type))->>'resource_id')::uuid;
  perform private.h04_generate(v_worker_rule,v_actor,gen_random_uuid(),v_today,2);
  update public.requirement_rules set operation_pauses=jsonb_build_array(jsonb_build_object('paused_from',v_today,'resumed_on',v_today+40,'reason','Paused during partial batch','actor_id',v_actor,'cause','rule_paused')) where id=v_worker_rule;
  perform private.h04_generate(v_worker_rule,v_actor,gen_random_uuid(),v_today+40,3);
  perform pg_temp.expect((select count(*)=5 from public.obligations where rule_id=v_worker_rule),'resume completes all destinations of a pinned partial occurrence before advancing');

  v_event_input:=v_input||jsonb_build_object('title','Termination event','document_type_id',v_worker_type,'frequency','eventual','deadline_offset_days',3,'applicability_conditions',
    '{"schema_version":1,"employment_stage":"cese","event_types":["worker_terminated"],"termination_reasons":["renuncia"]}'::jsonb);
  v_event_rule:=(pg_temp.command(v_org,'ConfigureRequirement',v_event_input)->>'resource_id')::uuid;
  update public.employment_periods set end_date=v_today,termination_reason='despido' where id=v_employment;
  perform pg_temp.command(v_org,'EmitRequirementEvent',jsonb_build_object('rule_id',v_event_rule,'event_id',v_event,'event_type','worker_terminated','reference_date',v_today,'employment_period_id',v_employment));
  perform pg_temp.command(v_org,'EmitRequirementEvent',jsonb_build_object('rule_id',v_event_rule,'event_id',v_event,'event_type','worker_terminated','reference_date',v_today,'employment_period_id',v_employment));
  perform pg_temp.expect((select count(*)=1 from public.obligations where rule_id=v_event_rule),'stable event identity deduplicates');
  perform pg_temp.expect((select disposition='no_aplica' and disposition_reason is not null from public.obligations where rule_id=v_event_rule),'termination reason mismatch records No aplica with history');
  v_result:=public.h03_command(v_org,gen_random_uuid(),'EmitRequirementEvent',jsonb_build_object('rule_id',v_event_rule,'event_id',v_event,'event_type','worker_terminated','reference_date',v_today,'employment_period_id',gen_random_uuid()));
  perform pg_temp.expect(v_result->'error'->>'code'='VALIDATION_ERROR','unknown employment period rejected instead of completing silently');
  v_result:=public.h03_command(v_org,gen_random_uuid(),'GenerateRule',jsonb_build_object('rule_id','bad-id'));
  perform pg_temp.expect(v_result->'error'->>'code'='VALIDATION_ERROR','malformed generation ID returns safe domain error');
  perform pg_temp.command(v_org,'EmitRequirementEvent',jsonb_build_object('rule_id',v_event_rule,'event_id',v_event,'event_type','worker_terminated','reference_date',v_today,'employment_period_id',v_employment));
  perform pg_temp.expect((select generation_cursor->>'last_error' is null and generation_cursor->>'last_generated_at' is not null and generation_cursor->>'last_completed_occurrence' is null from public.requirement_rules where id=v_event_rule),'successful event retry clears error and preserves calendar cursor');
  v_single:=(pg_temp.command(v_org,'ConfigureRequirement',v_input||jsonb_build_object('title','Single deadline','frequency','unica','anchor_date',v_today+10,'deadline_offset_days',0))->>'resource_id')::uuid;
  perform pg_temp.command(v_org,'GenerateRule',jsonb_build_object('rule_id',v_single));
  perform pg_temp.command(v_org,'GenerateRule',jsonb_build_object('rule_id',v_single));
  perform pg_temp.expect((select count(*)=1 and min(initial_due_date)=v_today+10 from public.obligations where rule_id=v_single),'unique future deadline generated once at activation');

  update public.profiles set enabled=false where user_id=v_client;
  v_result:=public.h03_command(v_org,gen_random_uuid(),'ConfigureRequirement',v_input);
  perform pg_temp.expect(v_result->'error'->>'code'='VALIDATION_ERROR','activation rejects an ineligible inherited owner');
  v_single:=(pg_temp.command(v_org,'ConfigureRequirement',v_input||'{"title":"Inactive draft","active":false}')->>'resource_id')::uuid;
  select revision into v_revision from public.requirement_rules where id=v_single;
  v_result:=public.h03_command(v_org,gen_random_uuid(),'SetRuleActive',jsonb_build_object('rule_id',v_single,'expected_revision',v_revision,'active',true));
  perform pg_temp.expect(v_result->'error'->>'code'='VALIDATION_ERROR','draft remains inactive when activation eligibility fails');
  v_result:=public.h03_command(v_org,gen_random_uuid(),'ConfigureRequirement',v_input||'{"allowed_formats":[],"deliverable_specs":[]}');
  perform pg_temp.expect(v_result->'error'->>'code'='VALIDATION_ERROR','empty formats and positions rejected');
  perform private.h04_reconcile_assignments(v_org,100);
  perform pg_temp.expect((select assignment_issue and delivery_responsible_id=v_client and snapshot=v_original from public.obligations where id=v_obligation),'lost access keeps obligation, original assignee and snapshot');
  select count(*) into v_count from public.notification_events where organization_id=v_org and event_type='assignment_issue';
  perform private.h04_reconcile_assignments(v_org,100);
  perform pg_temp.expect((select count(*)=v_count from public.notification_events where organization_id=v_org and event_type='assignment_issue'),'assignment alerts do not repeat');
  update public.profiles set enabled=true where user_id=v_client;
  select revision into v_revision from public.obligations where id=v_obligation;
  perform pg_temp.command(v_org,'ReassignDelivery',jsonb_build_object('obligation_id',v_obligation,'expected_revision',v_revision,'delivery_responsible_id',v_client,'reason','Restore eligible fixture owner'));
  perform pg_temp.expect((select not assignment_issue and snapshot=v_original from public.obligations where id=v_obligation),'reassignment clears issue without changing snapshot');
  perform pg_temp.expect(not has_function_privilege('authenticated','public.h04_run_generation(uuid,integer)','EXECUTE'),'browser cannot invoke system worker');
  select revision into v_revision from public.requirement_rules where id=v_daily;
  perform pg_temp.command(v_org,'DeleteDocumentEntity',jsonb_build_object('entity','requirement_rules','id',v_daily,'expected_revision',v_revision,'reason','Separate child deletion'));
  select revision into v_revision from public.document_types where id=v_type;
  v_result:=pg_temp.command(v_org,'DeleteDocumentEntity',jsonb_build_object('entity','document_types','id',v_type,'expected_revision',v_revision,'reason','Parent deletion fixture'));
  v_result:=public.h03_command(v_org,gen_random_uuid(),'GenerateRule',jsonb_build_object('rule_id',v_rule));
  perform pg_temp.expect(v_result->'error'->>'code'='FORBIDDEN','deleted type blocks new generation');
  perform pg_temp.expect((public.h03_query(v_org,'detail',jsonb_build_object('id',v_obligation))->>'ok')::boolean,'emitted obligation stays available after deleting configuration');
  perform pg_temp.expect((select snapshot=v_original from public.obligations where id=v_obligation),'parent deletion preserves emitted snapshot');
  select revision into v_revision from public.document_types where id=v_type;
  perform pg_temp.command(v_org,'RestoreDocumentEntity',jsonb_build_object('entity','document_types','id',v_type,'expected_revision',v_revision,'reason','Restore parent fixture'));
  perform pg_temp.expect((select deleted_at is not null from public.requirement_rules where id=v_daily),'restoring parent does not restore separately deleted child');
end $$;
select extensions.pass('H04 versioning, onboarding, recovery, pauses, destination batches, events and assignment acceptance');
select * from extensions.finish();
rollback;
