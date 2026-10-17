-- ONE-OFF AUTHORIZED FIXTURE CLEANUP. Not a migration or seed.
-- Exact H02/H03 demo organization only. Default finish is ROLLBACK.
begin;
set local lock_timeout='5s';
set local statement_timeout='45s';

create temporary table cleanup_fixture_users(user_id uuid primary key,email text not null) on commit drop;
insert into cleanup_fixture_users values
 ('0e09d258-f462-4fa7-aa47-0f012abe2f86','admin.h02@example.test'),
 ('9300cc45-84b8-435c-b742-0af4c16d1b57','contador.h02@example.test'),
 ('521e6a37-869c-41e6-a99e-6341b7412952','supervisor.h02@example.test'),
 ('b209854d-29ff-4077-ae23-6ef79b8c2e94','cliente.h02@example.test'),
 ('5794b31a-42e5-4ae8-9c3a-ca54c1da1045','recuperacion.h02@example.test');
create temporary table cleanup_snapshot(table_name text primary key,target_count bigint,outside_count bigint,outside_hash text) on commit drop;
create temporary table cleanup_schema(fingerprint text) on commit drop;
create temporary table cleanup_history_definition(definition text) on commit drop;

-- Only the known demo organization row is locked. No global/table locks.
select id from public.organizations where id='2803cd5e-8343-46ea-b300-c55ce84c92f1' for update;

do $$
declare org constant uuid := '2803cd5e-8343-46ea-b300-c55ce84c92f1';
  admin_id constant uuid := '0e09d258-f462-4fa7-aa47-0f012abe2f86';
  t record; scope text; total_rows bigint; outside_rows bigint; outside_digest text; unexpected boolean;
begin
  if not exists(select 1 from public.organizations where id=org and name='Estudio contable' and created_by=admin_id)
    then raise exception 'CLEANUP_SCOPE_MISMATCH_OR_ALREADY_REMOVED'; end if;
  if (select count(*) from public.organization_members where organization_id=org)<>5
    or exists(select 1 from public.organization_members where organization_id=org and user_id not in(select user_id from cleanup_fixture_users))
    or exists(select 1 from public.organization_members where user_id in(select user_id from cleanup_fixture_users) and organization_id<>org)
    then raise exception 'CLEANUP_UNEXPECTED_MEMBERSHIP'; end if;
  if (select count(*) from public.profiles p join cleanup_fixture_users u on p.user_id=u.user_id and p.email=u.email)<>5
    or exists(select 1 from cleanup_fixture_users u left join auth.users a on a.id=u.user_id where a.id is null or a.email<>u.email)
    then raise exception 'CLEANUP_ACCOUNT_IDENTITY_CHANGED'; end if;
  if (select count(*) from public.companies where organization_id=org)<>2
    or exists(select 1 from public.companies where organization_id=org and not (
      (id='8150f2e7-f131-46e0-bd0b-ab6533ac778f' and ruc='20000000001' and legal_name='Empresa de demostración H02') or
      (id='3f8fc1df-8570-449d-89d1-02802ac312f8' and ruc='20000000002' and legal_name='Segunda empresa de demostración H02')))
    then raise exception 'CLEANUP_UNEXPECTED_COMPANY'; end if;
  if (select count(*) from public.requirement_rules where organization_id=org)<>3
    or exists(select 1 from public.requirement_rules where organization_id=org and (id not in (
      '2bbd6bcd-5b43-427c-b8c7-42484047e015','2c445665-9515-4556-a86c-2ac6a6ab3cdc','df872f60-e41b-41cd-8ffd-faa531e80ef1') or title not like 'PDT demostracion H03 %'))
    then raise exception 'CLEANUP_UNEXPECTED_RULE'; end if;
  if (select count(*) from public.obligations where organization_id=org)<>3
    or exists(select 1 from public.obligations where organization_id=org and id not in (
      '12732cb3-5fc4-4f80-88cc-e2ab2199c42d','8bf46f95-11aa-47ea-bdd3-c2771a2137c1','0da470df-58d6-400c-b589-e1483fe098fe'))
    then raise exception 'CLEANUP_UNEXPECTED_OBLIGATION'; end if;
  if exists(select 1 from public.workers where organization_id=org)
    or exists(select 1 from public.employment_periods where organization_id=org)
    or (select count(*) from public.document_types where organization_id=org)<>1
    or exists(select 1 from public.document_types where organization_id=org and (id<>'8535b290-605c-48a4-a870-5cab6716efde' or code<>'h03_pdt_demo'))
    or (select count(*) from public.roles where organization_id=org)<>4
    or exists(select 1 from public.roles where organization_id=org and code not in ('contador','supervisor','cliente','h02_recuperable'))
    then raise exception 'CLEANUP_UNEXPECTED_DOMAIN_DATA'; end if;

  -- Refuse unrecognized tables rather than infer their ownership.
  if exists(select 1 from pg_tables where schemaname='public' and tablename not in (
    'organizations','profiles','organization_members','companies','roles','permissions','role_permissions','access_grants',
    'grant_permission_overrides','company_module_settings','app_sessions','audit_events','operation_requests',
    'workers','employment_periods','document_types','requirement_rules','rule_versions','periods','obligations',
    'deliverables','submission_cycles','upload_intents','document_versions','review_events','notification_events','notifications'))
    then raise exception 'CLEANUP_UNRECOGNIZED_TABLE'; end if;

  for t in select tablename from pg_tables where schemaname='public' order by tablename loop
    scope := case t.tablename
      when 'organizations' then format('id=%L::uuid',org)
      when 'profiles' then 'user_id in(select user_id from cleanup_fixture_users)'
      else format('organization_id=%L::uuid',org) end;
    execute format('select count(*) filter(where %s),count(*) filter(where not(%s)),
      md5(coalesce(string_agg(md5(to_jsonb(row_data)::text),'''' order by to_jsonb(row_data)::text) filter(where not(%s)),'''')) from public.%I row_data',
      scope,scope,scope,t.tablename) into total_rows,outside_rows,outside_digest;
    insert into cleanup_snapshot values(t.tablename,total_rows,outside_rows,outside_digest);
    execute format('select exists(select 1 from public.%I row_data where (%s) and exists (
      select 1 from jsonb_each_text(to_jsonb(row_data)) e where e.key in
      (''created_by'',''updated_by'',''deleted_by'',''user_id'',''actor_user_id'',''reviewer_id'',''uploaded_by'',''recipient_id'',''delivery_responsible_id'')
      and e.value is not null and e.value not in(select user_id::text from cleanup_fixture_users)))',t.tablename,scope) into unexpected;
    if unexpected then raise exception 'CLEANUP_UNEXPECTED_ACTOR_%',t.tablename; end if;
  end loop;
  if exists(select 1 from storage.objects s where s.bucket_id in ('documents','document-reception') and s.name like org::text||'/%'
    and not exists(select 1 from public.upload_intents i where i.organization_id=org and
      ((i.staging_bucket=s.bucket_id and i.staging_path=s.name) or (i.final_bucket=s.bucket_id and i.final_path=s.name))))
    then raise exception 'CLEANUP_UNRECOGNIZED_STORAGE_PATH'; end if;
end $$;

-- Includes table/column, constraints, indexes, triggers, function definitions and migration history.
insert into cleanup_schema select md5(coalesce(string_agg(item,'|' order by item),'')) from (
  select 'column:'||table_name||':'||column_name||':'||data_type||':'||is_nullable||':'||coalesce(column_default,'') item from information_schema.columns where table_schema='public'
  union all select 'constraint:'||conrelid::text||':'||conname||':'||pg_get_constraintdef(oid) from pg_constraint where connamespace='public'::regnamespace
  union all select 'index:'||indexname||':'||indexdef from pg_indexes where schemaname='public'
  union all select 'trigger:'||tgrelid::text||':'||tgname||':'||tgenabled::text||':'||pg_get_triggerdef(oid) from pg_trigger where not tgisinternal and tgrelid in(select oid from pg_class where relnamespace='public'::regnamespace)
  union all select 'function:'||p.oid::text||':'||pg_get_functiondef(p.oid) from pg_proc p where pronamespace in ('public'::regnamespace,'private'::regnamespace) and prokind='f'
  union all select 'migration:'||version from supabase_migrations.schema_migrations
) definitions;

-- The history trigger stays enabled. A transaction-private exception accepts DELETE
-- only for this demo UUID in this exact admin transaction; every other action fails.
-- The original function definition is restored before COMMIT and checked below.
insert into cleanup_history_definition select pg_get_functiondef('private.keep_document_history()'::regprocedure);
select set_config('taxskill.fixture_cleanup_tx',txid_current()::text,true);
create or replace function private.keep_document_history() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE' and old.organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1'::uuid
    and current_user in ('postgres','supabase_admin')
    and current_setting('taxskill.fixture_cleanup_tx',true)=txid_current()::text then return old; end if;
  perform private.fail('FORBIDDEN'); return null;
end $$;

delete from public.notifications where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
delete from public.notification_events where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
delete from public.review_events where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
update public.deliverables set current_version_id=null,review_state='pendiente' where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
update public.upload_intents set confirmed_version_id=null,state='expired',validation_token=null,validation_lease_until=null where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
delete from public.document_versions where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
delete from public.upload_intents where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
delete from public.submission_cycles where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
delete from public.deliverables where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
delete from public.obligations where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
update public.requirement_rules set active=false,current_version_id=null where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
delete from public.rule_versions where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
delete from public.requirement_rules where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
delete from public.periods where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
delete from public.document_types where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
delete from public.grant_permission_overrides where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
delete from public.access_grants where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
delete from public.role_permissions where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
delete from public.company_module_settings where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
delete from public.audit_events where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
delete from public.operation_requests where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
delete from public.app_sessions where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
delete from public.roles where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
delete from public.permissions where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
delete from public.companies where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
delete from public.organization_members where organization_id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
delete from public.organizations where id='2803cd5e-8343-46ea-b300-c55ce84c92f1';
delete from public.profiles where user_id in(select user_id from cleanup_fixture_users);

do $$ begin execute (select definition from cleanup_history_definition); end $$;

do $$ declare t record; remaining bigint; outside_digest text; begin
  for t in select * from cleanup_snapshot loop
    execute format('select count(*),md5(coalesce(string_agg(md5(to_jsonb(row_data)::text),'''' order by to_jsonb(row_data)::text),'''')) from public.%I row_data',t.table_name) into remaining,outside_digest;
    if remaining<>t.outside_count or outside_digest<>t.outside_hash then raise exception 'CLEANUP_OUTSIDE_SCOPE_CHANGED_%',t.table_name; end if;
  end loop;
  if (select fingerprint from cleanup_schema) is distinct from (
    select md5(coalesce(string_agg(item,'|' order by item),'')) from (
      select 'column:'||table_name||':'||column_name||':'||data_type||':'||is_nullable||':'||coalesce(column_default,'') item from information_schema.columns where table_schema='public'
      union all select 'constraint:'||conrelid::text||':'||conname||':'||pg_get_constraintdef(oid) from pg_constraint where connamespace='public'::regnamespace
      union all select 'index:'||indexname||':'||indexdef from pg_indexes where schemaname='public'
      union all select 'trigger:'||tgrelid::text||':'||tgname||':'||tgenabled::text||':'||pg_get_triggerdef(oid) from pg_trigger where not tgisinternal and tgrelid in(select oid from pg_class where relnamespace='public'::regnamespace)
      union all select 'function:'||p.oid::text||':'||pg_get_functiondef(p.oid) from pg_proc p where pronamespace in ('public'::regnamespace,'private'::regnamespace) and prokind='f'
      union all select 'migration:'||version from supabase_migrations.schema_migrations
    ) definitions) then raise exception 'CLEANUP_SCHEMA_CHANGED'; end if;
end $$;

-- CLEANUP_FINISH: replaced only in the explicitly authorized execution copy.
rollback;
select 'dry_run_ok' result;
