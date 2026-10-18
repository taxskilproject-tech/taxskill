-- Local Docker only: lifecycle fixtures never leave this rolled-back transaction.
begin;
\ir helpers/auth-session.psql
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();
create function pg_temp.expect(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'H05 acceptance: %',label; end if; end $$;
create function pg_temp.command(org uuid,op text,input jsonb,req uuid default gen_random_uuid()) returns jsonb language plpgsql as $$
declare response jsonb;
begin response:=public.h03_command(org,req,op,input); if not coalesce((response->>'ok')::boolean,false) then raise exception 'H05 %: %',op,response; end if; return response->'data'; end $$;
create function pg_temp.fail_batch() returns trigger language plpgsql as $$
begin if current_setting('h05.fail_batch',true)='yes' then raise exception 'Injected Docker failure'; end if; return new; end $$;
create trigger h05_fixture_failure before insert on public.deliverables for each row execute function pg_temp.fail_batch();

do $$
declare v_org uuid:=gen_random_uuid(); v_actor uuid:=gen_random_uuid(); v_client uuid:=gen_random_uuid(); v_member uuid; v_actor_member uuid; v_role uuid; v_company uuid;
  v_type uuid; v_rule uuid; v_payroll uuid; v_worker uuid; v_second_worker uuid; v_stage uuid; v_second_stage uuid; v_historical uuid; v_partial uuid;
  v_input jsonb; v_worker_input jsonb; v_stage_input jsonb; v_result jsonb; v_original jsonb; v_request uuid:=gen_random_uuid(); v_cursor jsonb;
  v_today date:=(now() at time zone 'America/Lima')::date; v_revision integer; v_count integer; v_next date;
begin
  insert into auth.users(id,email) values(v_actor,'h05-a-'||v_actor||'@example.test'),(v_client,'h05-c-'||v_client||'@example.test');
  insert into public.profiles(user_id,email,full_name,provisioning_status) select id,email,'H05 SQL fixture','ready' from auth.users where id in(v_actor,v_client);
  insert into public.organizations(id,name) values(v_org,'H05 Docker SQL');
  insert into public.organization_members(organization_id,user_id,member_type,is_admin) values(v_org,v_actor,'internal',true) returning id into v_actor_member;
  insert into public.organization_members(organization_id,user_id,member_type) values(v_org,v_client,'client') returning id into v_member;
  insert into public.companies(organization_id,ruc,legal_name,control_start_date) values(v_org,'20999999555','H05 SQL company',v_today-30) returning id into v_company;
  insert into public.roles(organization_id,code,name,audience) values(v_org,'h05_client','H05 client','client') returning id into v_role;
  insert into public.permissions(organization_id,module,action,description) select v_org,m,a,a from unnest(array['tributario','laboral_general','laboral_trabajador']) m cross join unnest(array['view','upload','download','workers.manage']) a where a<>'workers.manage' or m='laboral_trabajador';
  insert into public.role_permissions(organization_id,role_id,permission_id) select v_org,v_role,id from public.permissions where organization_id=v_org and action<>'workers.manage';
  insert into public.access_grants(organization_id,member_id,scope,company_id,module,role_id) select v_org,v_member,'company',v_company,m,v_role from unnest(array['tributario','laboral_general','laboral_trabajador']) m;
  insert into public.roles(organization_id,code,name,audience) values(v_org,'h05_internal','H05 internal','internal') returning id into v_role;
  insert into public.role_permissions(organization_id,role_id,permission_id) select v_org,v_role,id from public.permissions where organization_id=v_org;
  insert into public.access_grants(organization_id,member_id,scope,company_id,module,role_id) select v_org,v_actor_member,'company',v_company,m,v_role from unnest(array['tributario','laboral_general','laboral_trabajador']) m;
  insert into public.company_module_settings(organization_id,company_id,module,delivery_responsible_id) select v_org,v_company,m,v_client from unnest(array['tributario','laboral_general','laboral_trabajador']) m;
  perform pg_temp.authenticate(jsonb_build_object('sub',v_actor,'role','authenticated','session_id',gen_random_uuid())::text,true);
  perform pg_temp.expect((public.h02_context()->>'ok')::boolean,'administrator admitted');
  v_input:=jsonb_build_object('company_id',v_company,'title','H05 configuration','frequency','eventual','deadline_offset_days',3,'active',true,'allowed_formats',jsonb_build_array('pdf'),'max_file_bytes',20000000,
    'deliverable_specs','[{"position_code":"file_1","label":"Required document","display_order":1,"allowed_formats":["pdf"],"max_file_bytes":20000000}]'::jsonb);
  for item in 1..4 loop
    v_type:=(pg_temp.command(v_org,'SaveDocumentType',jsonb_build_object('code','h05_'||item,'name','H05 document '||item,'module','laboral_trabajador','suggested_formats',jsonb_build_array('pdf'),'active',true))->>'resource_id')::uuid;
    v_result:=pg_temp.command(v_org,'ConfigureRequirement',v_input||jsonb_build_object('document_type_id',v_type,'title','H05 stage '||item,'frequency',case when item=2 then 'mensual' else 'eventual' end,
      'applicability_conditions',jsonb_build_object('schema_version',1,'employment_stage',case when item=1 then 'ingreso' when item=2 then 'relacion' else 'cese' end,
        'event_types',case when item=1 then '["worker_hired"]'::jsonb when item=2 then '[]'::jsonb else '["worker_terminated"]'::jsonb end,
        'termination_reasons',case when item=4 then '["renuncia"]'::jsonb else '[]'::jsonb end)));
    if item=2 then v_payroll:=(v_result->>'resource_id')::uuid; end if;
  end loop;
  v_worker_input:=jsonb_build_object('company_id',v_company,'identity_type','DNI','identity_number','00123456','first_names','Worker','last_names','Historical fixture','birth_date','1990-01-01','email',null,'phone',null,'address',null,'notes','Private fixture note');
  v_stage_input:=jsonb_build_object('start_date',v_today-60,'reference_salary','1234.50','currency','PEN','position','Analyst','department','Office','contract_type','Indefinite');
  v_result:=pg_temp.command(v_org,'RegisterWorker',v_worker_input||jsonb_build_object('employment',v_stage_input),v_request);
  v_worker:=(v_result->>'resource_id')::uuid; v_stage:=(v_result->>'employment_period_id')::uuid;
  v_result:=public.h07_query(v_org,'audit',jsonb_build_object('company_id',v_company,'module','laboral_trabajador','resource','employment_periods'));
  perform pg_temp.expect(v_result->'data'->>'count'='1' and (v_result->'data'->'rows'->0->>'resource_id')::uuid=v_stage,'employment audit resolves company and labor module');
  perform pg_temp.expect(v_result::text not like '%1234.50%' and v_result::text not like '%Private fixture note%','resolved employment audit does not expose salary or personal notes');
  perform pg_temp.expect((pg_temp.command(v_org,'RegisterWorker',v_worker_input||jsonb_build_object('employment',v_stage_input),v_request)->>'resource_id')::uuid=v_worker,'registration replay returns same identity');
  perform pg_temp.expect((select count(*)=2 from public.obligations where employment_period_id=v_stage),'old hire gets current checklist and payroll only');
  perform pg_temp.expect((select count(*)=1 and min(occurrence_key)=to_char(v_today,'YYYY-MM') from public.obligations where employment_period_id=v_stage and rule_id=v_payroll),'no automatic old payroll');
  perform pg_temp.expect(exists(select 1 from public.obligations where employment_period_id=v_stage and snapshot->'employment_event'->>'occurred_on'=(v_today-60)::text and initial_due_date=v_today+3),'checklist requested now preserves actual hire date');
  perform pg_temp.expect((public.h05_query(v_org,'worker',jsonb_build_object('company_id',v_company,'worker_id',v_worker))->'data'->'selected_period'->>'reference_salary')='1234.50','salary is exact decimal text');
  select jsonb_agg(to_jsonb(o) order by id) into v_original from public.obligations o where employment_period_id=v_stage;
  select revision into v_revision from public.employment_periods where id=v_stage;
  v_result:=public.h03_command(v_org,gen_random_uuid(),'EndEmployment',jsonb_build_object('company_id',v_company,'worker_id',v_worker,'employment_period_id',v_stage,'expected_revision',v_revision,'end_date',v_today-1));
  perform pg_temp.expect(v_result->'error'->>'code'='VALIDATION_ERROR' and (select end_date is null from public.employment_periods where id=v_stage),'invalid cese is atomic');
  v_result:=public.h03_command(v_org,gen_random_uuid(),'EndEmployment',jsonb_build_object('company_id',v_company,'worker_id',v_worker,'employment_period_id',v_stage,'expected_revision',v_revision,'end_date',v_today-1,'termination_reason','despido','reference_salary','1.00'));
  perform pg_temp.expect(v_result->'error'->>'code'='VALIDATION_ERROR' and (select reference_salary=1234.50 and end_date is null from public.employment_periods where id=v_stage),'cese cannot silently rewrite employment conditions');
  v_result:=pg_temp.command(v_org,'EndEmployment',jsonb_build_object('company_id',v_company,'worker_id',v_worker,'employment_period_id',v_stage,'expected_revision',v_revision,'end_date',v_today-1,'termination_reason','despido'));
  perform pg_temp.expect((select count(*)=4 from public.obligations where employment_period_id=v_stage),'cese creates configured documents');
  perform pg_temp.expect(exists(select 1 from public.obligations where employment_period_id=v_stage and disposition='no_aplica' and disposition_reason is not null),'renunciation letter is No aplica for another reason');
  select revision into v_revision from public.workers where id=v_worker;
  v_result:=pg_temp.command(v_org,'StartEmployment',jsonb_build_object('company_id',v_company,'worker_id',v_worker,'expected_revision',v_revision,'start_date',v_today,'reference_salary','2000.01','currency','PEN'));
  v_second_stage:=(v_result->>'resource_id')::uuid;
  perform pg_temp.expect(v_second_stage<>v_stage and (select sequence_number=2 from public.employment_periods where id=v_second_stage),'reentry creates a distinct stage and sequence');
  perform pg_temp.expect((select count(*)=2 from public.obligations where employment_period_id=v_second_stage),'reentry gets fresh current checklist and payroll');
  perform pg_temp.expect((select jsonb_agg(to_jsonb(o) order by id)=v_original from public.obligations o where employment_period_id=v_stage and id in(select (e->>'id')::uuid from jsonb_array_elements(v_original) e)),'reentry preserves original issued documents');
  select revision into v_revision from public.workers where id=v_worker;
  v_result:=public.h03_command(v_org,gen_random_uuid(),'StartEmployment',jsonb_build_object('company_id',v_company,'worker_id',v_worker,'expected_revision',v_revision,'start_date',v_today));
  perform pg_temp.expect(v_result->'error'->>'code'='CONFLICT','second open stage rejected');
  v_next:=(date_trunc('month',v_today)+interval '1 month')::date;
  perform private.h04_generate(v_payroll,v_actor,gen_random_uuid(),v_next,100);
  perform pg_temp.expect(not exists(select 1 from public.obligations where employment_period_id=v_stage and occurrence_key=to_char(v_next,'YYYY-MM')),'closed stage gets no fully later period');
  perform pg_temp.expect(exists(select 1 from public.obligations where employment_period_id=v_second_stage and occurrence_key=to_char(v_next,'YYYY-MM')),'open reentry is eligible next month');
  select revision into v_revision from public.employment_periods where id=v_second_stage;
  v_result:=public.h03_command(v_org,gen_random_uuid(),'CorrectEmployment',jsonb_build_object('company_id',v_company,'worker_id',v_worker,'employment_period_id',v_second_stage,'expected_revision',v_revision,'start_date',v_today-10,'reason','Fixture overlap'));
  perform pg_temp.expect(v_result->'error'->>'code'='CONFLICT','historical overlap correction rejected');
  v_result:=pg_temp.command(v_org,'CorrectEmployment',jsonb_build_object('company_id',v_company,'worker_id',v_worker,'employment_period_id',v_second_stage,'expected_revision',v_revision,'position','Corrected role','reason','Documented correction'));
  perform pg_temp.expect((select position='Corrected role' and reference_salary=2000.01 from public.employment_periods where id=v_second_stage),'reasoned correction preserves unmodified conditions');
  perform pg_temp.expect(exists(select 1 from public.audit_events where resource_id=v_second_stage and action='CorrectEmployment' and metadata->>'reason'='Documented correction'),'correction reason is audited');
  v_result:=public.h03_command(v_org,gen_random_uuid(),'RegisterWorker',v_worker_input||'{"identity_number":" 00123456 "}');
  perform pg_temp.expect(v_result->'error'->>'code'='CONFLICT','identity normalized and unique');
  select revision into v_revision from public.workers where id=v_worker;
  perform pg_temp.command(v_org,'DeleteWorker',jsonb_build_object('company_id',v_company,'worker_id',v_worker,'expected_revision',v_revision,'reason','Local removal fixture'));
  v_result:=public.h03_command(v_org,gen_random_uuid(),'RegisterWorker',v_worker_input);
  perform pg_temp.expect(v_result->'error'->>'code'='CONFLICT','deleted identity cannot be reused');
  select revision into v_revision from public.workers where id=v_worker;
  perform pg_temp.command(v_org,'RestoreWorker',jsonb_build_object('company_id',v_company,'worker_id',v_worker,'expected_revision',v_revision,'reason','Restore existing worker'));
  perform pg_temp.expect((select count(*)=2 from public.employment_periods where worker_id=v_worker),'restoration creates no employment');
  v_result:=pg_temp.command(v_org,'RegisterWorker',v_worker_input||jsonb_build_object('identity_number','00887766','employment',v_stage_input||jsonb_build_object('end_date',v_today-40,'termination_reason','fin_contrato')));
  v_historical:=(v_result->>'employment_period_id')::uuid;
  perform pg_temp.expect(not exists(select 1 from public.obligations where employment_period_id=v_historical),'pre-control cese retained without retroactive checklist');
  v_second_worker:=(v_result->>'resource_id')::uuid;
  v_result:=public.h05_query(v_org,'worker',jsonb_build_object('company_id',v_company,'worker_id',v_second_worker,'employment_period_id',v_stage));
  perform pg_temp.expect(v_result->'error'->>'code'='NOT_FOUND','foreign stage selector rejected');
  perform pg_temp.expect(not exists(select 1 from public.audit_events where organization_id=v_org and (before_values ?| array['reference_salary','termination_notes','notes','email'] or after_values ?| array['reference_salary','termination_notes','notes','email'])),'audit excludes salary and private notes');

  for item in 1..30 loop
    perform pg_temp.command(v_org,'ConfigureRequirement',v_input||jsonb_build_object('document_type_id',v_type,'title','H05 batch rule '||item,'applicability_conditions','{"schema_version":1,"employment_stage":"ingreso","event_types":["worker_hired"],"termination_reasons":[]}'::jsonb));
  end loop;
  v_result:=pg_temp.command(v_org,'RegisterWorker',v_worker_input||jsonb_build_object('identity_number','00776655','employment',v_stage_input));
  v_partial:=(v_result->>'employment_period_id')::uuid;
  perform pg_temp.expect(v_result->>'status'='pending','large employment checklist is durably paginated');
  select document_generation into v_cursor from public.employment_periods where id=v_partial;
  select count(*) into v_count from public.obligations where employment_period_id=v_partial;
  perform set_config('h05.fail_batch','yes',true);
  perform private.h05_process_employment(v_partial,v_actor,gen_random_uuid(),25);
  perform pg_temp.expect((select count(*)=v_count from public.obligations where employment_period_id=v_partial),'failed employment continuation has no partial documents');
  perform pg_temp.expect((select document_generation->'hire'->>'last_rule_id'=v_cursor->'hire'->>'last_rule_id' and document_generation->'hire'->>'status'='failed' from public.employment_periods where id=v_partial),'employment progress survives failure');
  perform set_config('h05.fail_batch','no',true);
  for item in 1..5 loop perform private.h05_process_employment(v_partial,v_actor,gen_random_uuid(),25); end loop;
  perform pg_temp.expect((select count(*)=32 from public.obligations where employment_period_id=v_partial),'recovery completes all checklist rules once');
  perform pg_temp.expect(not has_function_privilege('authenticated','public.h05_run_generation(uuid,integer)','EXECUTE'),'system worker unavailable to browser');
end $$;
select extensions.pass('H05 lifecycle, current onboarding, cese, reentry, exact salary, soft delete, scope and durable batch recovery');
select * from extensions.finish();
rollback;

