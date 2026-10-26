-- Docker only. No permanent fixture data or Storage objects are created.
begin;
\ir helpers/auth-session.psql
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();
\ir helpers/document-workspace.psql
create function pg_temp.tax_obligation(org uuid,company uuid,dtype uuid,actor uuid,p_kind text,first_day date,last_day date,due date,title text) returns uuid
language sql as $$ select pg_temp.period_obligation(org,company,dtype,actor,'tributario',p_kind,first_day,last_day,due,title); $$;
create function pg_temp.tax_suite() returns setof text language plpgsql as $$
declare org uuid:=gen_random_uuid(); foreign_org uuid:=gen_random_uuid(); actor uuid:=gen_random_uuid(); viewer uuid:=gen_random_uuid();
  company uuid; other_company uuid; pdt uuid; weekly uuid; custom uuid; annual uuid; member uuid; role_id uuid; permission uuid;
  result jsonb; base jsonb; jan uuid; week uuid;
begin
  insert into auth.users(id,email) values(actor,'tax-'||actor||'@example.test'),(viewer,'tax-'||viewer||'@example.test');
  insert into public.profiles(user_id,email,full_name,provisioning_status) select id,email,'Tax SQL Docker','ready' from auth.users where id in(actor,viewer);
  insert into public.organizations(id,name) values(org,'Tax workspace Docker'),(foreign_org,'Foreign Tax Docker');
  insert into public.organization_members(organization_id,user_id,member_type,is_admin) values(org,actor,'internal',true);
  insert into public.organization_members(organization_id,user_id,member_type) values(org,viewer,'client') returning id into member;
  insert into public.companies(organization_id,ruc,legal_name,control_start_date) values(org,'20999999661','Tax first','2026-01-01') returning id into company;
  insert into public.companies(organization_id,ruc,legal_name,control_start_date) values(org,'20999999662','Tax second','2026-01-01') returning id into other_company;
  insert into public.document_types(organization_id,module,code,name,suggested_formats) values(org,'tributario','tributario_pdt','PDT','{pdf}') returning id into pdt;
  insert into public.document_types(organization_id,module,code,name,suggested_formats) values(org,'tributario','tributario_control','Control','{pdf}') returning id into weekly;
  insert into public.document_types(organization_id,module,code,name,suggested_formats) values(org,'tributario','custom_daily','Custom daily','{pdf}') returning id into custom;
  insert into public.document_types(organization_id,module,code,name,suggested_formats) values(org,'tributario','custom_annual','Annual','{pdf}') returning id into annual;
  jan:=pg_temp.tax_obligation(org,company,pdt,actor,'monthly','2026-01-01','2026-01-31','2026-02-10','January PDT');
  perform pg_temp.tax_obligation(org,company,pdt,actor,'monthly','2026-02-01','2026-02-28','2026-03-10','February PDT');
  week:=pg_temp.tax_obligation(org,company,weekly,actor,'weekly','2026-01-26','2026-02-01','2026-02-02','Cross month week');
  perform pg_temp.tax_obligation(org,company,annual,actor,'annual','2026-01-01','2026-12-31','2027-01-10','Annual period');
  for day in 1..30 loop perform pg_temp.tax_obligation(org,company,custom,actor,'daily',make_date(2026,1,day),make_date(2026,1,day),'2026-02-10','Daily '||day); end loop;
  perform pg_temp.authenticate(jsonb_build_object('sub',actor,'role','authenticated','session_id',gen_random_uuid())::text,true);
  perform public.h02_context();
  base:=jsonb_build_object('company_id',company,'year',2026);
  result:=public.h03_query(org,'tax',base);
  return next extensions.ok(result->>'ok'='true' and jsonb_array_length(result#>'{data,rows}')=0,'no obligations before month selection');
  return next extensions.is((result#>>'{data,months,0,count}')::int,33,'month counts include all authorized types before pagination');
  result:=public.h03_query(org,'tax',base||'{"month":1}');
  return next extensions.is(result#>>'{data,selected_code}','tributario_pdt','first available standard type wins over custom data');
  return next extensions.is(result#>>'{data,groups,0,code}','tributario_pdt','groups follow documented canonical order');
  return next extensions.is(result#>>'{data,rows,0,id}',jan::text,'January due in February remains in January');
  return next extensions.is(result#>>'{data,rows,0,files,0,label}','PDT 1','required file order is independent of insertion order');
  return next extensions.is(result#>>'{data,rows,0,files,1,label}','PDT 2','two PDT files remain distinct positions');
  result:=public.h03_query(org,'tax',base||'{"month":1,"tax_code":"custom_daily","page":2}');
  return next extensions.is((result#>>'{data,count}')::int,30,'type count precedes pagination');
  return next extensions.is(jsonb_array_length(result#>'{data,rows}'),5,'second page has remaining obligations');
  return next extensions.is(result#>>'{data,rows,0,period_start}','2026-01-26','period ordering is stable across pages');
  result:=public.h03_query(org,'tax',base||'{"month":2,"tax_code":"tributario_control"}');
  return next extensions.is(result#>>'{data,rows,0,id}',week::text,'cross-month week is accessible in both overlapping months without duplication');
  return next extensions.is((public.h03_query(org,'tax',base||'{"month":2,"tax_code":"custom_annual"}')#>>'{data,count}')::int,1,'annual periods remain accessible from the monthly workspace');
  return next extensions.is((public.h03_query(org,'tax',base||'{"month":1,"state":"aprobado"}')#>>'{data,count}')::int,0,'state filter is applied before count');
  return next extensions.is((public.h03_query(org,'tax',base||jsonb_build_object('month',1,'company_id',other_company))#>>'{data,count}')::int,0,'other company does not leak rows');
  return next extensions.is(public.h03_query(foreign_org,'tax',base)#>>'{error,code}','FORBIDDEN','other study is denied');
  return next extensions.is(public.h03_query(org,'tax',base||'{"month":13}')#>>'{error,code}','VALIDATION_ERROR','invalid month rejected');
  return next extensions.is(public.h03_query(org,'tax',base||'{"year":"wrong"}')#>>'{error,code}','VALIDATION_ERROR','invalid year rejected without SQL details');
  return next extensions.is(public.h03_query(org,'tax',base||'{"page":0}')#>>'{error,code}','VALIDATION_ERROR','invalid page rejected');
  return next extensions.ok(public.h03_query(org,'list',jsonb_build_object('company_id',company,'module','tributario'))->>'ok'='true','legacy obligation list remains compatible');
  insert into public.permissions(organization_id,module,action,description) values(org,'tributario','view','Tax viewer') returning id into permission;
  insert into public.roles(organization_id,code,name,audience) values(org,'tax_view','Tax viewer','client') returning id into role_id;
  insert into public.role_permissions(organization_id,role_id,permission_id) values(org,role_id,permission);
  insert into public.access_grants(organization_id,member_id,scope,company_id,module,role_id) values(org,member,'company',company,'tributario',role_id);
  perform pg_temp.authenticate(jsonb_build_object('sub',viewer,'role','authenticated','session_id',gen_random_uuid())::text,true);
  perform public.h02_context();
  return next extensions.ok(public.h03_query(org,'tax',base||'{"month":1}')->>'ok'='true','client with view permission can use the workspace');
  return next extensions.is(public.h03_query(org,'tax',base||jsonb_build_object('company_id',other_company))#>>'{error,code}','FORBIDDEN','client cannot switch to an unassigned company');
  update public.companies set deleted_at=now(),deleted_by=actor,deletion_reason='Tax SQL test' where id=company;
  return next extensions.is(public.h03_query(org,'tax',base)#>>'{error,code}','NOT_FOUND','deleted company is not operational');
end $$;
select * from pg_temp.tax_suite();
select * from extensions.finish();
rollback;
