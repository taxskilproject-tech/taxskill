-- ONLY the isolated TaxSkill Docker laboratory. Every fixture rolls back.
begin;
\ir helpers/auth-session.psql
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

create function pg_temp.h09_cases() returns setof text language plpgsql as $$
declare org uuid:=gen_random_uuid(); actor uuid:=gen_random_uuid(); limited uuid:=gen_random_uuid(); sid uuid:=gen_random_uuid(); mid uuid; role_id uuid;
 hdr public.deliverable_templates; ver public.deliverable_template_versions; result jsonb; input jsonb; items jsonb; company uuid; essalud uuid; sis uuid;
 req uuid:=gen_random_uuid(); custom uuid; r public.requirement_rules; mod text; today date:=(now() at time zone 'America/Lima')::date;
 future_company uuid; future_rule uuid; cfg jsonb; before_groups jsonb; new_ver public.deliverable_template_versions; profile jsonb; insurance text; use_afp boolean;
begin
 insert into auth.users(id,email) values(actor,'h09-'||actor||'@example.test'),(limited,'h09-'||limited||'@example.test');
 insert into public.profiles(user_id,email,full_name,provisioning_status) select id,email,'H09 SQL fixture','ready' from auth.users where id in(actor,limited);
 insert into public.organizations(id,name) values(org,'H09 isolated SQL');
 insert into public.organization_members(organization_id,user_id,member_type,is_admin) values(org,actor,'internal',true) returning id into mid;
 insert into public.organization_members(organization_id,user_id,member_type,is_admin) values(org,limited,'client',false);
 insert into public.permissions(organization_id,module,action,description) select org,m,a,a from unnest(array['tributario','laboral_general','laboral_trabajador']) m cross join unnest(array['view','upload','download','workers.manage']) a where a<>'workers.manage' or m='laboral_trabajador';
 insert into public.roles(organization_id,code,name,audience) values(org,'h09_internal','H09 internal','internal') returning id into role_id;
 insert into public.role_permissions(organization_id,role_id,permission_id) select org,role_id,id from public.permissions where organization_id=org;
 insert into public.document_types(organization_id,module,code,name,category,suggested_formats)
 select org,case when c like 'tributario_%' then 'tributario' when c like 'laboral_%' then 'laboral_general' else 'laboral_trabajador' end,
 c,c,case when c like 'tributario_%' then 'tributario' when c like 'laboral_%' then 'laboral_general' else split_part(c,'_',1) end,array['pdf']
 from unnest(array['tributario_calculo','tributario_pdt','tributario_compras','tributario_ventas','tributario_control','tributario_consulta_pdt','tributario_consulta_pagos',
 'laboral_asistencia','laboral_planilla','laboral_planilla_afp','laboral_pago_afp','laboral_reporte_sis','laboral_pago_sis','laboral_reporte_essalud','laboral_pago_essalud','laboral_reporte_plame','laboral_constancia_plame',
 'ingreso_ficha','ingreso_alta','ingreso_contrato','ingreso_cv','ingreso_examen','relacion_boleta','relacion_memorandum','relacion_adenda','relacion_comunicacion','cese_liquidacion','cese_certificado','cese_pago','cese_renuncia']) c;

 perform private.h09_initialize(org,actor,gen_random_uuid());
 perform pg_temp.authenticate(jsonb_build_object('sub',actor,'role','authenticated','session_id',sid)::text,true);
 perform public.h02_context();
 return next extensions.is((select count(*)::int from public.deliverable_templates where organization_id=org),8,'eight regime drafts are independent');
 select * into hdr from public.deliverable_templates where organization_id=org and regime_code='rg';
 select * into ver from public.deliverable_template_versions where template_id=hdr.id;
 return next extensions.is(jsonb_array_length(ver.items),30,'base catalog includes SIS and EsSalud alternatives');
 return next extensions.ok(jsonb_array_length(private.h09_template_issues(org,ver.items))>0,'no invented deadline: initial draft has actionable issues');
 result:=public.h02_command(org,gen_random_uuid(),'PublishDeliverableTemplate',jsonb_build_object('template_id',hdr.id,'version_id',ver.id,'expected_revision',ver.revision));
 return next extensions.is(result#>>'{error,code}','VALIDATION_ERROR','incomplete draft cannot publish');
 select jsonb_agg(jsonb_set(jsonb_set(i,'{configuration,deadline_offset_days}','2'),'{configuration,frequency}',coalesce(nullif(i#>'{configuration,frequency}','null'::jsonb),'"mensual"'::jsonb)) order by (i->>'position')::int) into items from jsonb_array_elements(ver.items) i;
 result:=public.h02_command(org,gen_random_uuid(),'SaveDeliverableTemplate',jsonb_build_object('template_id',hdr.id,'version_id',ver.id,'expected_revision',ver.revision,'items',items));
 return next extensions.is(result->>'ok','true','complete draft saves through existing admitted RPC');
 select * into ver from public.deliverable_template_versions where id=ver.id;
 result:=public.h02_command(org,gen_random_uuid(),'PublishDeliverableTemplate',jsonb_build_object('template_id',hdr.id,'version_id',ver.id,'expected_revision',ver.revision));
 return next extensions.is(result->>'ok','true','complete version publishes');
 return next extensions.throws_ok(format('update public.deliverable_template_versions set items=''[]'' where id=%L',ver.id),'P0001','CONFLICT','published versions are immutable');
 input:=jsonb_build_object('ruc','20999999091','legal_name','H09 tax','control_start_date',today,'status','active','tax_regime_code','rg','document_template_version_id',ver.id,
  'documentary_profile','{"schema_version":1,"plame":false,"afp":false,"igv_renta":true,"health_coverage":"none"}'::jsonb);
 result:=public.h02_command(org,req,'CreateOrUpdateCompany',input); company:=(result#>>'{data,resource_id}')::uuid;
 return next extensions.is(result->>'ok','true','company and preparation are created together');
 return next extensions.is((public.h02_command(org,req,'CreateOrUpdateCompany',input)#>>'{data,resource_id}')::uuid,company,'retry returns the same company');
 return next extensions.is((select count(*)::int from public.requirement_rules where company_id=company),7,'IGV-only company receives exactly seven deliverables');
 return next extensions.is((select count(*)::int from public.requirement_rules where company_id=company and preparation_pending),7,'all initial deliverables wait for responsible');
 return next extensions.is((select count(*)::int from public.obligations where company_id=company),0,'preparation creates no obligations');
 return next extensions.is((select count(*)::int from public.notifications where organization_id=org),0,'preparation sends no internal notices');
 result:=public.h02_command(org,gen_random_uuid(),'CreateOrUpdateCompany',input||jsonb_build_object('ruc','20999999092','documentary_profile','{"schema_version":1,"plame":false,"afp":true,"igv_renta":true,"health_coverage":"none"}'::jsonb));
 return next extensions.is(result#>>'{error,code}','VALIDATION_ERROR','AFP without PLAME rejected on server');
 result:=public.h02_command(org,gen_random_uuid(),'CreateOrUpdateCompany',input||jsonb_build_object('ruc','20999999092','documentary_profile','{"schema_version":1,"plame":false,"afp":false,"igv_renta":false,"health_coverage":"none"}'::jsonb));
 return next extensions.is(result#>>'{error,code}','VALIDATION_ERROR','at least one documentary module is required');
 result:=public.h02_command(org,gen_random_uuid(),'CreateOrUpdateCompany',input||jsonb_build_object('ruc','20999999092','tax_regime_code','written_typo'));
 return next extensions.is(result#>>'{error,code}','VALIDATION_ERROR','regime typo rejected');
 result:=public.h02_command(org,gen_random_uuid(),'CreateOrUpdateCompany',input||jsonb_build_object('ruc','20999999092','document_template_version_id',gen_random_uuid()));
 return next extensions.is(result#>>'{error,code}','CONFLICT','stale preview cannot apply another version');
 result:=public.h02_command(org,gen_random_uuid(),'CreateOrUpdateCompany',input||jsonb_build_object('ruc','20999999092','documentary_profile','{"schema_version":1,"plame":true,"afp":false,"igv_renta":false,"health_coverage":"essalud"}'::jsonb));
 essalud:=(result#>>'{data,resource_id}')::uuid;
 return next extensions.is((select count(*)::int from public.requirement_rules where company_id=essalud),19,'EsSalud without AFP receives 19 applicable deliverables');
 return next extensions.is((select count(*)::int from public.requirement_rules where company_id=essalud and applicability_key in ('sis','afp')),0,'EsSalud branch excludes SIS and AFP');
 result:=public.h02_command(org,gen_random_uuid(),'CreateOrUpdateCompany',input||jsonb_build_object('ruc','20999999093','documentary_profile','{"schema_version":1,"plame":true,"afp":true,"igv_renta":false,"health_coverage":"sis"}'::jsonb));
 sis:=(result#>>'{data,resource_id}')::uuid;
 return next extensions.is((select count(*)::int from public.requirement_rules where company_id=sis),21,'SIS with AFP receives 21 applicable deliverables');
 return next extensions.is((select count(*)::int from public.requirement_rules where company_id=sis and applicability_key='essalud'),0,'SIS excludes EsSalud');
 insert into public.access_grants(organization_id,member_id,scope,company_id,module,role_id) values(org,mid,'company',essalud,'laboral_trabajador',role_id);
 result:=public.h03_command(org,gen_random_uuid(),'RegisterWorker',jsonb_build_object('company_id',essalud,'identity_type','DNI','identity_number','09090909','first_names','H09','last_names','Pending worker',
  'employment',jsonb_build_object('start_date',today-20,'reference_salary','1500.00','currency','PEN')));
 return next extensions.is(result->>'ok','true','worker can be entered while initial preparation waits');
 return next extensions.is((select count(*)::int from public.obligations where company_id=essalud),0,'worker without responsible has no premature obligations');
 result:=public.h02_command(org,gen_random_uuid(),'SaveModuleSettings',jsonb_build_object('company_id',essalud,'module','laboral_trabajador','delivery_responsible_id',actor));
 return next extensions.is(result->>'ok','true','labor responsible resumes recorded hire event');
 return next extensions.is((select count(*)::int from public.obligations where company_id=essalud),6,'known hire emits five entry documents and one current payroll without duplicates');
 return next extensions.is((select count(*)::int from public.obligations o join public.document_types t on t.id=o.document_type_id where o.company_id=essalud and t.category='cese'),0,'no termination event means no termination documents');
 result:=public.h02_command(org,gen_random_uuid(),'SaveModuleSettings',jsonb_build_object('company_id',essalud,'module','laboral_trabajador','delivery_responsible_id',actor,'id',(select id from public.company_module_settings where company_id=essalud and module='laboral_trabajador'),'expected_revision',(select revision from public.company_module_settings where company_id=essalud and module='laboral_trabajador')));
 return next extensions.is((select count(*)::int from public.obligations where company_id=essalud),6,'responsible retry never replays or duplicates recorded events');
 result:=public.h02_command(org,gen_random_uuid(),'SaveModuleSettings',jsonb_build_object('company_id',company,'module','tributario','delivery_responsible_id',actor));
 return next extensions.is(result#>>'{error,code}','VALIDATION_ERROR','administrator is not implicitly granted delivery');
 insert into public.access_grants(organization_id,member_id,scope,company_id,module,role_id) values(org,mid,'company',company,'tributario',role_id);
 -- Simulate waiting for initial assignment: activation must move the control floor forward.
 update public.requirement_rules set control_start_date=today-interval '2 months' where company_id=company;
 result:=public.h02_command(org,gen_random_uuid(),'SaveModuleSettings',jsonb_build_object('company_id',company,'module','tributario','delivery_responsible_id',actor));
 return next extensions.is(result->>'ok','true','eligible responsible activates initial preparation');
 return next extensions.is((select count(*)::int from public.requirement_rules where company_id=company and preparation_pending),0,'initial pending marker is cleared');
 return next extensions.ok((select bool_and(control_start_date>=today) from public.requirement_rules where company_id=company),'late assignment begins at current date, not prior cycles');
 return next extensions.is((select count(*)::int from public.obligations where company_id=company),7,'one current occurrence per tax deliverable');
 return next extensions.ok((select bool_and(p.start_date<=today and p.end_date>=today) from public.obligations o join public.periods p on p.id=o.period_id where o.company_id=company),'generated periods contain activation day');
 select * into r from public.requirement_rules where company_id=company order by presentation_order limit 1;
 perform public.h03_command(org,gen_random_uuid(),'SetRuleActive',jsonb_build_object('rule_id',r.id,'expected_revision',r.revision,'active',false,'reason','Deliberate manual pause'));
 result:=public.h02_command(org,gen_random_uuid(),'SaveModuleSettings',jsonb_build_object('company_id',company,'module','tributario','delivery_responsible_id',actor,'id',(select id from public.company_module_settings where company_id=company),'expected_revision',(select revision from public.company_module_settings where company_id=company)));
 return next extensions.is((select active from public.requirement_rules where id=r.id),false,'saving responsible never reactivates a manual pause');
 result:=public.h03_query(org,'document_workspace',jsonb_build_object('company_id',company,'module','tributario','year',extract(year from today),'month',extract(month from today)));
 return next extensions.is(jsonb_array_length(result#>'{data,groups}'),7,'all configured types remain visible');
 return next extensions.is(result#>>'{data,groups,0,code}','tributario_calculo','template order is preserved');
 return next extensions.is(result#>>'{data,groups,0,setup_state}','paused','empty-state metadata distinguishes pause');
 result:=public.h03_query(org,'catalog_usage',jsonb_build_object('id',r.document_type_id));
 return next extensions.is((result#>>'{data,count}')::int,1,'usage reports the actual assigned company');
 -- Exhaustive PLAME/AFP/coverage branches, all checked at the SQL boundary.
 foreach insurance in array array['none','sis','essalud'] loop
  foreach use_afp in array array[false,true] loop
   profile:=jsonb_build_object('schema_version',1,'plame',true,'afp',use_afp,'igv_renta',true,'health_coverage',insurance);
   return next extensions.ok(private.h09_profile_valid(profile),'valid profile: '||insurance||' AFP='||use_afp);
   return next extensions.is((select count(*)::int from jsonb_array_elements(items) i where private.h09_applies(profile,i->>'module',i->>'condition')),24+case when use_afp then 2 else 0 end+case when insurance<>'none' then 2 else 0 end,'exact applicable checklist: '||insurance||' AFP='||use_afp);
  end loop;
 end loop;
 return next extensions.ok(not private.h09_profile_valid('{"schema_version":1,"plame":true,"afp":false,"igv_renta":false}'::jsonb),'missing explicit insurance is rejected');
 return next extensions.ok(not private.h09_profile_valid(input->'documentary_profile'||'{"unknown":true}'::jsonb),'unknown profile fields rejected');
 return next extensions.ok(jsonb_array_length(private.h09_template_issues(org,jsonb_build_array((items->0)#-'{configuration,priority}')))>0,'missing publication fields cannot pass SQL NULL validation');
 result:=public.h02_command(org,gen_random_uuid(),'CreateOrUpdateCompany',input||jsonb_build_object('ruc','20999999094','tax_regime_code','nuevo_rus','document_template_version_id',(select published_version_id from public.deliverable_templates where organization_id=org and regime_code='nuevo_rus')));
 return next extensions.is(result#>>'{error,code}','VALIDATION_ERROR','unpublished regime blocks company creation');
 result:=public.h02_command(org,gen_random_uuid(),'CreateOrUpdateCompany',input||jsonb_build_object('ruc','20999999094','control_start_date',today+40));
 future_company:=(result#>>'{data,resource_id}')::uuid;
 insert into public.access_grants(organization_id,member_id,scope,company_id,module,role_id) values(org,mid,'company',future_company,'tributario',role_id);
 result:=public.h02_command(org,gen_random_uuid(),'SaveModuleSettings',jsonb_build_object('company_id',future_company,'module','tributario','delivery_responsible_id',actor));
 return next extensions.is(result->>'ok','true','future company can prepare an eligible responsible');
 return next extensions.is((select count(*)::int from public.obligations where company_id=future_company),0,'future start emits no obligations prematurely');
 result:=public.h03_query(org,'document_workspace',jsonb_build_object('company_id',future_company,'module','tributario','year',extract(year from today),'month',extract(month from today)));
 return next extensions.is(result#>>'{data,groups,0,setup_state}','scheduled','future start has a specific empty-state reason');
 -- Extra type appends after existing configured types, independently of period counts.
 insert into public.document_types(organization_id,module,code,name,category,suggested_formats) values(org,'tributario','extra_h09','Extra H09','tributario',array['pdf']) returning id into custom;
 cfg:=(items->0->'configuration')||jsonb_build_object('company_id',company,'document_type_id',custom,'title','Extra H09','frequency','mensual','active',false,'inherit_responsible',true,'control_start_date',today);
 result:=public.h03_command(org,gen_random_uuid(),'ConfigureRequirement',cfg);
 return next extensions.is(result->>'ok','true','a company-only extra reuses the configuration operation');
 return next extensions.is((select presentation_order from public.requirement_rules where document_type_id=custom),8,'extra has continuous ordinal eight');
 result:=public.h03_query(org,'document_workspace',jsonb_build_object('company_id',company,'module','tributario','year',extract(year from today),'month',extract(month from today)));
 select jsonb_agg(i->>'code') into before_groups from jsonb_array_elements(result#>'{data,groups}') i;
 result:=public.h03_query(org,'document_workspace',jsonb_build_object('company_id',company,'module','tributario','year',extract(year from today)-1,'month',1));
 return next extensions.is((select jsonb_agg(i->>'code') from jsonb_array_elements(result#>'{data,groups}') i),before_groups,'configured order is identical in an empty historical month');
 return next extensions.is((select jsonb_array_length(v.items) from public.deliverable_template_versions v where id=ver.id),30,'company extra does not alter its template');
 -- Editing a publication forks a draft; publishing it never rewrites old companies.
 result:=public.h02_command(org,gen_random_uuid(),'SaveDeliverableTemplate',jsonb_build_object('template_id',hdr.id,'version_id',ver.id,'expected_revision',ver.revision+1,'items',items));
 return next extensions.is(result->>'ok','true','editing a published template creates a separate draft');
 select * into new_ver from public.deliverable_template_versions where template_id=hdr.id order by version_number desc limit 1;
 return next extensions.is(new_ver.version_number,2,'fork gets the next version');
 result:=public.h02_command(org,gen_random_uuid(),'PublishDeliverableTemplate',jsonb_build_object('template_id',hdr.id,'version_id',new_ver.id,'expected_revision',new_ver.revision));
 return next extensions.is(result->>'ok','true','next version publishes independently');
 return next extensions.is((select document_template_version_id from public.companies where id=company),ver.id,'existing company keeps its original version');
 result:=public.h02_command(org,gen_random_uuid(),'CreateOrUpdateCompany',input||jsonb_build_object('ruc','20999999095'));
 return next extensions.is(result#>>'{error,code}','CONFLICT','stale summary must be refreshed after a new publication');
 result:=public.h02_command(org,gen_random_uuid(),'CreateOrUpdateCompany',input||jsonb_build_object('id',company,'expected_revision',(select revision from public.companies where id=company),'document_template_version_id',new_ver.id,'documentary_profile','{"schema_version":1,"plame":true,"afp":false,"igv_renta":false,"health_coverage":"none"}'::jsonb));
 return next extensions.is(result#>>'{error,code}','CONFLICT','profile changes require explicit preview confirmation');
 result:=public.h02_command(org,gen_random_uuid(),'CreateOrUpdateCompany',input||jsonb_build_object('id',company,'expected_revision',(select revision from public.companies where id=company),'confirm_document_changes',true,'document_template_version_id',new_ver.id,'documentary_profile','{"schema_version":1,"plame":true,"afp":false,"igv_renta":false,"health_coverage":"none"}'::jsonb));
 return next extensions.is(result->>'ok','true','confirmed profile change preserves company identity');
 return next extensions.is((select count(*)::int from public.obligations where company_id=company),7,'profile change preserves previously issued obligations');
 return next extensions.is((select count(*)::int from public.requirement_rules where company_id=company and module='tributario' and active),0,'disabled module stops future solicitation');
 result:=public.h02_command(org,gen_random_uuid(),'DeleteEntity',jsonb_build_object('entity','companies','id',company,'expected_revision',(select revision from public.companies where id=company),'reason','H09 historical usage fixture'));
 return next extensions.is(result->>'ok','true','company soft delete preserves copied configuration');
 return next extensions.is((private.h09_usage(org,r.document_type_id,false,1)->>'count')::int,1,'operational usage excludes the deleted parent');
 return next extensions.is((private.h09_usage(org,r.document_type_id,true,1)->>'count')::int,2,'historical usage includes deleted parent and current future company');
 select set_config('h09.org',org::text,true) into mod;
 perform pg_temp.authenticate(jsonb_build_object('sub',limited,'role','authenticated','session_id',gen_random_uuid())::text,true);
 perform public.h02_context();
 result:=public.h02_command(org,gen_random_uuid(),'PublishDeliverableTemplate',jsonb_build_object('template_id',hdr.id,'version_id',ver.id,'expected_revision',0));
 return next extensions.is(result#>>'{error,code}','FORBIDDEN','client cannot publish templates');
 return next extensions.throws_ok(format('select public.h03_query(%L,''deliverable_templates'',''{}'')',org),'P0001','FORBIDDEN','client cannot read administrative template data');
 perform pg_temp.authenticate(jsonb_build_object('sub',actor,'role','authenticated','session_id',sid)::text,true);
 update public.app_sessions set revoked_at=now(),revocation_reason='H09 fixture' where organization_id=org and session_id=sid;
 return next extensions.throws_ok(format('select public.h03_query(%L,''deliverable_templates'',''{}'')',org),'P0001','UNAUTHENTICATED','revoked session cannot read template data');
end $$;
select * from pg_temp.h09_cases();
select * from extensions.finish();
rollback;
