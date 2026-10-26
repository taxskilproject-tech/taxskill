-- Local Docker only. Includes real database roles, Auth session rows, and rollback of every fixture.
begin;
\ir helpers/auth-session.psql
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();
create function pg_temp.id(p_key text) returns uuid language sql stable as $$ select (current_setting('h08.ids')::jsonb->>p_key)::uuid $$;
create function pg_temp.command(org uuid,op text,input jsonb) returns jsonb language plpgsql as $$
declare r jsonb;
begin r:=public.h03_command(org,gen_random_uuid(),op,input); if r->>'ok'<>'true' then raise exception 'H08 setup %: %',op,r; end if; return r->'data'; end $$;
do $$
declare org uuid:=gen_random_uuid(); other_org uuid:=gen_random_uuid(); actor uuid:=gen_random_uuid(); limited uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid();
  admin_sid uuid:=gen_random_uuid(); sid uuid:=gen_random_uuid(); member uuid; admin_member uuid; role_id uuid; admin_role uuid; company_a uuid; company_b uuid; foreign_company uuid;
  dtype uuid; rule uuid; obligation uuid; first_obligation uuid; input jsonb; today date:=(now() at time zone 'America/Lima')::date;
begin
  insert into auth.users(id,email) values(actor,'h08-admin-'||actor||'@example.test'),(limited,'h08-client-'||limited||'@example.test'),(outsider,'h08-other-'||outsider||'@example.test');
  insert into public.profiles(user_id,email,full_name,provisioning_status) select id,email,'H08 SQL fixture','ready' from auth.users where id in(actor,limited,outsider);
  insert into public.organizations(id,name) values(org,'H08 scope A'),(other_org,'H08 scope B');
  insert into public.organization_members(organization_id,user_id,member_type,is_admin) values(org,actor,'internal',true) returning id into admin_member;
  insert into public.organization_members(organization_id,user_id,member_type) values(org,limited,'client') returning id into member;
  insert into public.organization_members(organization_id,user_id,member_type,is_admin) values(other_org,outsider,'internal',true);
  insert into public.companies(organization_id,ruc,legal_name,control_start_date) values(org,'20999999881','H08 A',today) returning id into company_a;
  insert into public.companies(organization_id,ruc,legal_name,control_start_date) values(org,'20999999882','H08 B',today) returning id into company_b;
  insert into public.companies(organization_id,ruc,legal_name,control_start_date) values(other_org,'20999999881','H08 another study',today) returning id into foreign_company;
  insert into public.permissions(organization_id,module,action,description) select org,m,a,a from unnest(array['tributario','laboral_trabajador']) m cross join unnest(array['view','upload','download','approve','reports.view','reports.export','audit.view']) a;
  insert into public.roles(organization_id,code,name,audience) values(org,'h08_internal','H08 internal','internal') returning id into admin_role;
  insert into public.roles(organization_id,code,name,audience) values(org,'h08_client','H08 client','client') returning id into role_id;
  insert into public.role_permissions(organization_id,role_id,permission_id) select org,admin_role,id from public.permissions where organization_id=org;
  insert into public.role_permissions(organization_id,role_id,permission_id) select org,role_id,id from public.permissions where organization_id=org and action in('view','upload','download','reports.view');
  insert into public.access_grants(organization_id,member_id,scope,company_id,module,role_id) values
    (org,admin_member,'company',company_a,'tributario',admin_role),(org,admin_member,'company',company_b,'tributario',admin_role),
    (org,member,'company',company_a,'tributario',role_id),(org,member,'company',company_b,'laboral_trabajador',role_id);
  insert into public.company_module_settings(organization_id,company_id,module,delivery_responsible_id) values(org,company_a,'tributario',actor),(org,company_b,'tributario',actor);
  insert into public.workers(organization_id,company_id,identity_type,identity_number,first_names,last_names) values
    (org,company_a,'DNI','90000081','H08 hidden','Worker'),(org,company_b,'DNI','90000082','H08 visible','Worker');
  perform pg_temp.authenticate(jsonb_build_object('sub',actor,'role','authenticated','session_id',admin_sid)::text,true);
  dtype:=(pg_temp.command(org,'SaveDocumentType','{"code":"h08","name":"H08 tax","module":"tributario","suggested_formats":["pdf"],"active":true}')->>'resource_id')::uuid;
  foreach obligation in array array[company_a,company_b] loop
    input:=jsonb_build_object('document_type_id',dtype,'company_id',obligation,'title','H08 isolated obligation','deadline_offset_days',7,
      'allowed_formats','["pdf"]'::jsonb,'max_file_bytes',20000000,'deliverable_specs','[{"position_code":"a","label":"A","display_order":1,"allowed_formats":["pdf"],"max_file_bytes":20000000}]'::jsonb);
    rule:=(pg_temp.command(org,'ConfigureRequirement',input)->>'resource_id')::uuid;
    input:=pg_temp.command(org,'GenerateMonthly',jsonb_build_object('rule_id',rule));
    if obligation=company_a then first_obligation:=(input->>'resource_id')::uuid; end if;
  end loop;
  perform set_config('h08.ids',jsonb_build_object('org',org,'other_org',other_org,'actor',actor,'limited',limited,'outsider',outsider,
    'sid',sid,'admin_sid',admin_sid,'company_a',company_a,'company_b',company_b,'foreign_company',foreign_company,'obligation',first_obligation)::text,true);
  perform pg_temp.authenticate(jsonb_build_object('sub',limited,'role','authenticated','session_id',sid)::text,true);
end $$;

select extensions.is((select count(*)::integer from pg_tables where schemaname='public' and rowsecurity),31,'all 31 business tables including H09 templates have RLS');
select extensions.ok(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'h0%' and has_function_privilege('anon',p.oid,'EXECUTE')),'anonymous has no business RPC execution');
select extensions.ok(not has_function_privilege('authenticated','public.h03_confirm_upload(uuid,uuid,uuid,uuid,jsonb)','EXECUTE'),'client cannot confirm trusted validation');
select extensions.ok(not has_table_privilege('authenticated','public.audit_events','INSERT'),'audit cannot be fabricated');
select extensions.ok(not has_table_privilege('authenticated','public.notifications','SELECT'),'notices stay behind scoped RPC');
select extensions.ok(not has_column_privilege('authenticated','public.upload_intents','validation_token','SELECT'),'validation token is private');
select extensions.ok(not has_function_privilege('authenticated','public.h02_bootstrap(uuid,text)','EXECUTE'),'bootstrap restricted to service');

set local role authenticated;
select extensions.is((select count(*)::integer from public.organizations),1,'another study is invisible');
select extensions.is((select count(*)::integer from public.companies),2,'each company granted by a different module is visible');
select extensions.is((select count(*)::integer from public.profiles),1,'raw profile access only reveals self');
select extensions.is((select count(*)::integer from public.organization_members),1,'other membership identities are private');
select extensions.is((select count(*)::integer from public.workers),1,'labor view in B does not grant workers in A');
select extensions.is((select count(*)::integer from public.obligations),1,'tax in A does not grant tax in B');
select extensions.is((select count(*)::integer from public.h03_obligation_summary),1,'security-invoker summary respects row policies');
select extensions.is((select count(*)::integer from public.deliverables),1,'child rows follow obligation scope');
select extensions.is((select count(*)::integer from public.roles),0,'role administration is not a client directory');
select extensions.is((select count(*)::integer from public.access_grants),2,'only own assignments can be read');
select extensions.throws_ok('insert into public.organizations(name) values (''forged'')','42501',null,'raw inserts denied');
select extensions.throws_ok('update public.companies set legal_name=''forged''','42501',null,'raw updates denied');
select extensions.throws_ok('delete from public.document_versions','42501',null,'history cannot be deleted');
select extensions.is(public.h07_query(pg_temp.id('other_org'),'dashboard','{}')->'error'->>'code','FORBIDDEN','RPC refuses another study');
select extensions.is(public.h03_query(pg_temp.id('org'),'detail',jsonb_build_object('id',pg_temp.id('obligation')))->>'ok','true','allowed detail remains functional');
select extensions.is(public.h05_query(pg_temp.id('org'),'workers',jsonb_build_object('company_id',pg_temp.id('company_b'),'include_deleted',true))->'error'->>'code','FORBIDDEN','include_deleted cannot grant history administration');
select extensions.throws_ok('select * from public.audit_events','42501',null,'raw audit does not bypass scoped audit RPC');
select extensions.throws_ok('insert into public.app_sessions(organization_id,user_id,session_id) values (pg_temp.id(''org''),auth.uid(),gen_random_uuid())','42501',null,'session admission cannot be forged');
select set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.id('limited'),'role','authenticated','session_id',gen_random_uuid())::text,true);
select extensions.is((select count(*)::integer from public.companies),0,'valid actor plus invented session cannot read');
select extensions.is(public.h02_context()->'error'->>'code','UNAUTHENTICATED','context never inserts an invented session');
select set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.id('limited'),'role','authenticated','session_id',pg_temp.id('sid'))::text,true);
reset role;

update public.app_sessions set revoked_at=now(),revocation_reason='H08 fixture' where session_id=pg_temp.id('sid');
set local role authenticated;
select extensions.is((select count(*)::integer from public.companies),0,'revoked session loses raw reads immediately');
select extensions.is(public.h02_context()->'error'->>'code','UNAUTHENTICATED','revoked session cannot readmit itself');
reset role;
select extensions.throws_ok('update auth.users set encrypted_password=''forged'' where id=pg_temp.id(''limited''); set constraints auth.h08_guard_auth_credentials immediate','P0001','Password changes require the administrator','direct credential changes are rejected at commit boundary');
select extensions.is(public.h08_block_auth_email('{}')->'error'->>'http_code','403','Auth mail hook rejects recovery and magic links');
select pg_temp.authenticate(jsonb_build_object('sub',pg_temp.id('limited'),'role','authenticated','session_id',gen_random_uuid())::text,true);
set local role authenticated;
select extensions.is((select count(*)::integer from public.companies),2,'fresh Auth session restores valid access');
reset role;
update public.organization_members set active=false where organization_id=pg_temp.id('org') and user_id=pg_temp.id('limited');
update public.organization_members set active=true where organization_id=pg_temp.id('org') and user_id=pg_temp.id('limited');
set local role authenticated;
select extensions.is((select count(*)::integer from public.companies),0,'reactivation does not revive the old session');
reset role;
select pg_temp.authenticate(jsonb_build_object('sub',pg_temp.id('limited'),'role','authenticated','session_id',gen_random_uuid())::text,true);
update public.companies set status='inactive' where id=pg_temp.id('company_a');
set local role authenticated;
select extensions.is((select count(*)::integer from public.obligations),0,'inactive parent blocks current document access');
select extensions.is(public.h03_query(pg_temp.id('org'),'detail',jsonb_build_object('id',pg_temp.id('obligation')))->'error'->>'code','NOT_FOUND','RPC agrees with inactive-parent denial');
reset role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select extensions.ok(public.h08_consume_rate_limit('admin',repeat('a',64),1,60),'first administrative request is admitted');
select extensions.ok(not public.h08_consume_rate_limit('admin',repeat('a',64),1,60),'rate limit is durable across requests');
select extensions.ok(not exists(select 1 from cron.job where jobname like 'h08%'),'migration did not activate jobs');
select set_config('h08.unverified',gen_random_uuid()::text,true);
insert into auth.sessions(id,user_id,aal,created_at,updated_at) values(current_setting('h08.unverified')::uuid,pg_temp.id('limited'),'aal1',now(),now());
select set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.id('limited'),'role','authenticated','session_id',current_setting('h08.unverified'))::text,true);
set local role authenticated;
select extensions.is((select count(*)::integer from public.companies),0,'Auth row alone is insufficient without trusted password admission');
select extensions.throws_ok('select public.h08_access_token_hook(''{}'')','42501',null,'browser cannot call the trusted token hook');
select extensions.is(public.h08_health(pg_temp.id('org'))->'error'->>'code','UNAUTHENTICATED','unverified session cannot inspect health');
reset role;
select extensions.is(public.h08_access_token_hook(jsonb_build_object('user_id',pg_temp.id('limited'),'authentication_method','token_refresh',
  'claims',jsonb_build_object('sub',pg_temp.id('limited'),'session_id',current_setting('h08.unverified'))))->'error'->>'http_code','403','refresh cannot admit an unverified session');
select extensions.is(public.h08_access_token_hook(jsonb_build_object('user_id',pg_temp.id('limited'),'authentication_method','recovery',
  'claims',jsonb_build_object('sub',pg_temp.id('limited'),'session_id',current_setting('h08.unverified'))))->'error'->>'http_code','403','recovery method cannot admit an application session');
select set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.id('actor'),'role','authenticated','session_id',pg_temp.id('admin_sid'))::text,true);
set local role authenticated;
select extensions.is(public.h08_health(pg_temp.id('org'))->>'ok','true','admin health remains available through its scoped RPC');
reset role;
select * from extensions.finish();
rollback;
