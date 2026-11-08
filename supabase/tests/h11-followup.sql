-- H11 fixtures run only in isolated Docker. Every row is rolled back.
begin;
\ir helpers/auth-session.psql
\ir helpers/document-workspace.psql
\ir helpers/document-upload.psql
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();
create function pg_temp.command(org uuid,op text,input jsonb) returns jsonb language plpgsql as $$
declare result jsonb;
begin
 result:=public.h03_command(org,gen_random_uuid(),op,input);
 if result->>'ok'<>'true' then raise exception 'Fixture operation % failed: %',op,result; end if;
 return result->'data';
end $$;
create function pg_temp.h11_suite() returns setof text language plpgsql as $$
declare org uuid:=gen_random_uuid(); admin_id uuid:=gen_random_uuid(); assistant uuid:=gen_random_uuid();
 other_assistant uuid:=gen_random_uuid(); staff uuid:=gen_random_uuid(); sid uuid:=gen_random_uuid(); client_sid uuid:=gen_random_uuid();
 company uuid; other_company uuid; dtype uuid; member_admin uuid; member_a uuid; member_b uuid; member_staff uuid; role_client uuid; role_staff uuid;
 late_obligation uuid; timely_obligation uuid; yearly uuid; slot public.deliverables; intent uuid; cycle uuid;
 late_slot uuid; timely_slot uuid; result jsonb; scope jsonb; row jsonb; other_scope jsonb;
 today date:=(now() at time zone 'America/Lima')::date;
begin
 insert into auth.users(id,email) values(admin_id,'h11-admin-'||admin_id||'@example.test'),(assistant,'h11-client-'||assistant||'@example.test'),
  (other_assistant,'h11-other-'||other_assistant||'@example.test'),(staff,'h11-staff-'||staff||'@example.test');
 insert into public.profiles(user_id,email,full_name,provisioning_status)
  select id,email,'Nombre compartido','ready' from auth.users where id in(admin_id,assistant,other_assistant,staff);
 insert into public.organizations(id,name) values(org,'H11 Docker');
 insert into public.organization_members(organization_id,user_id,member_type,is_admin) values(org,admin_id,'internal',true) returning id into member_admin;
 insert into public.organization_members(organization_id,user_id,member_type) values(org,assistant,'client') returning id into member_a;
 insert into public.organization_members(organization_id,user_id,member_type) values(org,other_assistant,'client') returning id into member_b;
 insert into public.organization_members(organization_id,user_id,member_type) values(org,staff,'internal') returning id into member_staff;
 insert into public.companies(organization_id,ruc,legal_name,control_start_date)
  values(org,'20999999111','H11 Empresa A','2026-01-01') returning id into company;
 insert into public.companies(organization_id,ruc,legal_name,control_start_date)
  values(org,'20999999112','H11 Empresa B','2026-01-01') returning id into other_company;
 insert into public.permissions(organization_id,module,action,description)
  select org,'tributario',a,a from unnest(array['view','upload','download','approve','observe','reopen']) a;
 insert into public.roles(organization_id,code,name,audience) values(org,'h11_client','Asistente','client') returning id into role_client;
 insert into public.roles(organization_id,code,name,audience) values(org,'h11_staff','Contador','internal') returning id into role_staff;
 insert into public.role_permissions(organization_id,role_id,permission_id)
  select org,r,p.id from unnest(array[role_client,role_staff]) r cross join public.permissions p
   where p.organization_id=org and (r=role_staff or p.action in ('view','upload','download'));
 insert into public.access_grants(organization_id,member_id,company_id,scope,module,role_id)
  values(org,member_a,company,'company','tributario',role_client),(org,member_b,company,'company','tributario',role_client),
   (org,member_staff,company,'company','tributario',role_staff),(org,member_admin,company,'company','tributario',role_staff);
 insert into public.company_module_settings(organization_id,company_id,module,delivery_responsible_id)
  values(org,company,'tributario',assistant);
 insert into public.document_types(organization_id,module,code,name,suggested_formats)
  values(org,'tributario','h11-test','H11 Entregable','{pdf}') returning id into dtype;
 late_obligation:=pg_temp.period_obligation(org,company,dtype,assistant,'tributario','monthly','2026-10-01','2026-10-31',today-1,'Documento de octubre');
 timely_obligation:=pg_temp.period_obligation(org,company,dtype,other_assistant,'tributario','monthly','2026-10-01','2026-10-31',today,'Otro documento');
 perform pg_temp.authenticate(jsonb_build_object('sub',admin_id,'role','authenticated','session_id',sid)::text,true);
 scope:=jsonb_build_object('company_id',company,'document_month','2026-10');
 result:=public.h07_query(org,'company_indicators',scope);
 return next extensions.is(result->>'ok','true','indicator RPC admitted');
 return next extensions.is(result#>>'{data,rows,0,pending}','4','four required files pending');
 return next extensions.is(result#>>'{data,rows,0,required}','2','compliance counts obligations');
 select * into slot from public.deliverables where obligation_id=late_obligation order by display_order limit 1;
 late_slot:=slot.id;
 select id into cycle from public.submission_cycles where deliverable_id=slot.id and state='open';
 perform pg_temp.authenticate(jsonb_build_object('sub',assistant,'role','authenticated','session_id',client_sid)::text,true);
 intent:=(pg_temp.command(org,'CreateUploadIntent',jsonb_build_object('deliverable_id',slot.id,'cycle_id',cycle,
  'expected_revision',slot.revision,'original_name','Archivo-asistente.pdf','declared_bytes',200,'declared_mime','application/pdf'))->>'resource_id')::uuid;
 perform pg_temp.confirm(intent,assistant,client_sid);
 -- Another version in the same delivery cycle must not multiply late files.
 select * into slot from public.deliverables where id=late_slot;
 intent:=(pg_temp.command(org,'CreateUploadIntent',jsonb_build_object('deliverable_id',slot.id,'cycle_id',cycle,
  'expected_revision',slot.revision,'original_name','Reemplazo-asistente.pdf','declared_bytes',200,'declared_mime','application/pdf'))->>'resource_id')::uuid;
 perform pg_temp.confirm(intent,assistant,client_sid);
 perform pg_temp.authenticate(jsonb_build_object('sub',admin_id,'role','authenticated','session_id',sid)::text,true);
 select * into slot from public.deliverables where obligation_id=timely_obligation order by display_order limit 1;
 timely_slot:=slot.id;
 select id into cycle from public.submission_cycles where deliverable_id=slot.id and state='open';
 intent:=(pg_temp.command(org,'CreateUploadIntent',jsonb_build_object('deliverable_id',slot.id,'cycle_id',cycle,
  'expected_revision',slot.revision,'original_name','Archivo-equipo.pdf','declared_bytes',200,'declared_mime','application/pdf'))->>'resource_id')::uuid;
 perform pg_temp.confirm(intent,admin_id,sid);
 result:=public.h07_query(org,'company_indicators',scope);
 return next extensions.is(result#>>'{data,rows,0,late}','1','multiple late versions count one required file');
 return next extensions.is(result#>>'{data,rows,0,on_time}','1','first submission on deadline is timely in Lima');
 return next extensions.is(result#>>'{data,rows,0,pending}','2','submitted files awaiting review are not delivery pending');
 row:=result#>'{data,rows,0}';
 result:=public.h07_query(org,'delivery_details',scope||'{"delivery_indicator":"pending"}');
 return next extensions.is(result#>>'{data,count}',row->>'pending','pending detail matches unique file count');
 result:=public.h07_query(org,'delivery_details',scope||'{"delivery_indicator":"on_time"}');
 return next extensions.is(result#>>'{data,count}',row->>'on_time','timely detail matches unique file count');
 result:=public.h07_query(org,'delivery_details',scope||'{"delivery_indicator":"compliance"}');
 return next extensions.is(result#>>'{data,count}',row->>'required','compliance detail counts obligations rather than files');
 result:=public.h07_query(org,'documents',scope||jsonb_build_object('assistant_id',assistant));
 return next extensions.is(result#>>'{data,count}','2','uploaded view filters each actual version author');
 result:=public.h07_query(org,'pending_deliveries',scope||jsonb_build_object('assistant_id',other_assistant));
 return next extensions.is(result#>>'{data,count}','1','pending view uses assigned responsible, not uploader');
 select * into slot from public.deliverables where id=late_slot;
 perform pg_temp.command(org,'ObserveVersion',jsonb_build_object('deliverable_id',slot.id,'version_id',slot.current_version_id,
  'expected_revision',slot.revision,'comment','Completar archivo','new_due_date',today+1));
 result:=public.h07_query(org,'pending_deliveries',scope||jsonb_build_object('assistant_id',assistant));
 return next extensions.is(result#>>'{data,count}','2','correction reopens required delivery for its responsible');
 result:=public.h07_query(org,'company_indicators',scope);
 return next extensions.is(result#>>'{data,rows,0,late}','1','observation preserves late history');
 return next extensions.is(result#>>'{data,rows,0,pending}','3','correction can coexist with previous delivery');
 result:=public.h07_query(org,'delivery_details',scope||'{"delivery_indicator":"late"}');
 return next extensions.is(result#>>'{data,count}','1','late drilldown matches indicator without versions duplicated');
 return next extensions.is(result#>>'{data,rows,0,due_date}',(today-1)::text,'late detail keeps the exceeded deadline instead of the open correction deadline');
 yearly:=pg_temp.period_obligation(org,company,dtype,assistant,'tributario','annual','2026-01-01','2026-12-31',today+1,'Control anual');
 result:=public.h07_query(org,'pending_deliveries',scope);
 return next extensions.is(result#>>'{data,count}','5','annual period overlaps selected October without copies');
 result:=public.h07_query(org,'pending_deliveries',scope||'{"document_month":"2026-11"}');
 return next extensions.is(result#>>'{data,count}','2','October uploaded in November stays in October');
 result:=public.h07_query(org,'document_assistants',scope);
 return next extensions.is(jsonb_array_length(result#>'{data,rows}'),2,'names can coincide; assistants keep different IDs');
 return next extensions.ok(result#>>'{data,rows,0,email}' is not null,'assistant identity includes email to distinguish equal names');
 result:=public.h07_query(org,'document_assistants',scope||'{"module":"laboral_general"}');
 return next extensions.is(jsonb_array_length(result#>'{data,rows}'),0,'assistant selector excludes grants belonging to another module');
 result:=public.h07_query(org,'document_assistants',scope||'{"scope":"internal"}');
 return next extensions.is(jsonb_array_length(result#>'{data,rows}'),0,'internal context has no company assistant options');
 for i in 1..14 loop
  perform pg_temp.period_obligation(org,company,dtype,assistant,'tributario','monthly','2026-10-01','2026-10-31',today+1,'Extra '||i);
 end loop;
 result:=public.h07_query(org,'pending_deliveries',scope||'{"page":2}');
 return next extensions.is(result#>>'{data,count}','33','server count covers all pages');
 return next extensions.is(jsonb_array_length(result#>'{data,rows}'),8,'second page is independently paginated');
 perform pg_temp.authenticate(jsonb_build_object('sub',assistant,'role','authenticated','session_id',client_sid)::text,true);
 result:=public.h07_query(org,'documents',scope);
 return next extensions.is(result#>>'{data,count}','2','client omission of assistant filter still forces own uploads');
 result:=public.h07_query(org,'documents',scope||jsonb_build_object('assistant_id',other_assistant));
 return next extensions.is(result#>>'{error,code}','FORBIDDEN','client cannot tamper assistant identity');
 result:=public.h07_query(org,'company_indicators',scope);
 return next extensions.is(result#>>'{data,rows,0,on_time}','0','client does not inherit timely delivery uploaded by another user');
 other_scope:=jsonb_build_object('company_id',other_company,'document_month','2026-10');
 result:=public.h07_query(org,'pending_deliveries',other_scope);
 return next extensions.is(result#>>'{data,count}','0','foreign company has no exposed pending rows');
 result:=public.h07_query(org,'company_indicators',other_scope);
 return next extensions.is(result#>>'{data,count}','0','foreign company is excluded before aggregation');
 result:=public.h07_query(org,'document_assistants',scope);
 return next extensions.is(jsonb_array_length(result#>'{data,rows}'),1,'client assistant options contain only self');
 perform pg_temp.authenticate(jsonb_build_object('sub',staff,'role','authenticated','session_id',gen_random_uuid())::text,true);
 result:=public.h07_query(org,'documents',scope||jsonb_build_object('assistant_id',assistant));
 return next extensions.is(result#>>'{data,count}','2','authorized internal staff can query assistant uploads without directory administration');
 result:=public.h07_query(org,'pending_deliveries',scope||'{"document_month":"2026-99"}');
 return next extensions.is(result#>>'{error,code}','VALIDATION_ERROR','invalid documentary month rejected');
 result:=public.h07_query(org,'company_indicators',scope||'{"scope":"internal"}');
 return next extensions.is(result#>>'{data,count}','0','internal activities do not expose company indicators');
 perform pg_temp.authenticate(jsonb_build_object('sub',admin_id,'role','authenticated','session_id',sid)::text,true);
 perform pg_temp.command(org,'ReassignDelivery',jsonb_build_object('obligation_id',late_obligation,
  'expected_revision',(select revision from public.obligations where id=late_obligation),
  'delivery_responsible_id',other_assistant,'reason','Cambio de encargado'));
 result:=public.h07_query(org,'pending_deliveries',scope||jsonb_build_object('assistant_id',other_assistant));
 return next extensions.is(result#>>'{data,count}','3','reassignment moves pending initial and correction slots');
 result:=public.h07_query(org,'documents',scope||jsonb_build_object('assistant_id',assistant));
 return next extensions.is(result#>>'{data,count}','2','reassignment preserves historical upload author');
 update public.organization_members set active=false,revision=revision+1 where id=member_b;
 result:=public.h07_query(org,'document_assistants',scope);
 return next extensions.is(jsonb_array_length(result#>'{data,rows}'),1,'inactive assistant omitted from operational selector');
 result:=public.h07_query(org,'document_assistants',scope||'{"include_deleted":true}');
 return next extensions.is(jsonb_array_length(result#>'{data,rows}'),2,'administrative history includes inactive assistant');
 result:=public.h07_query(org,'pending_deliveries',scope||'{"assistant_id":null}');
 return next extensions.is(result#>>'{error,code}','VALIDATION_ERROR','null assistant identity rejected explicitly');
 return next extensions.ok(not has_function_privilege('authenticated','private.h11_deliveries(uuid,uuid,jsonb)','execute'),
  'private helper cannot bypass authenticated RPC');
 select * into slot from public.deliverables where id=timely_slot;
 perform pg_temp.command(org,'ObserveVersion',jsonb_build_object('deliverable_id',slot.id,
  'version_id',slot.current_version_id,'expected_revision',slot.revision,'comment','Corrección histórica de fixture','new_due_date',today+1));
 -- Trusted Docker fixture defines an already expired correction deadline.
 update public.submission_cycles set due_date=today-1 where deliverable_id=timely_slot and state='open';
 select * into slot from public.deliverables where id=timely_slot;
 select id into cycle from public.submission_cycles where deliverable_id=timely_slot and state='open';
 intent:=(pg_temp.command(org,'CreateUploadIntent',jsonb_build_object('deliverable_id',slot.id,'cycle_id',cycle,
  'expected_revision',slot.revision,'original_name','Correccion-tardia.pdf','declared_bytes',200,'declared_mime','application/pdf'))->>'resource_id')::uuid;
 perform pg_temp.confirm(intent,admin_id,sid);
 result:=public.h07_query(org,'company_indicators',scope);
 return next extensions.is(result#>>'{data,rows,0,late}','2','timely initial delivery followed by late correction counts as one late file');
 return next extensions.is(result#>>'{data,rows,0,on_time}','0','corrected late file leaves the entirely timely group');
 select * into slot from public.deliverables where id=timely_slot;
 perform pg_temp.command(org,'ApproveVersion',jsonb_build_object('deliverable_id',slot.id,
  'version_id',slot.current_version_id,'expected_revision',slot.revision));
 select * into slot from public.deliverables where id=timely_slot;
 perform pg_temp.command(org,'ReopenApproved',jsonb_build_object('deliverable_id',slot.id,
  'version_id',slot.current_version_id,'expected_revision',slot.revision,'comment','Reapertura fixture','new_due_date',today+1));
 result:=public.h07_query(org,'pending_deliveries',scope||'{"pageSize":500}');
 return next extensions.ok(exists(select 1 from jsonb_array_elements(result#>'{data,rows}') r
  where r->>'id'=timely_slot::text and r->>'reason'='reopen'),'reopened file is a pending delivery with its new reason');
 perform pg_temp.period_obligation(org,company,dtype,assistant,'tributario','weekly','2026-10-31','2026-11-06',today+1,'Semana entre meses');
 result:=public.h07_query(org,'pending_deliveries',scope||'{"document_month":"2026-11"}');
 return next extensions.is(result#>>'{data,count}','4','cross-month week is visible in November with stable file identity');
 for slot in select * from public.deliverables where obligation_id=yearly order by display_order loop
  select id into cycle from public.submission_cycles where deliverable_id=slot.id and state='open';
  intent:=(pg_temp.command(org,'CreateUploadIntent',jsonb_build_object('deliverable_id',slot.id,'cycle_id',cycle,
   'expected_revision',slot.revision,'original_name','Control-anual.pdf','declared_bytes',200,'declared_mime','application/pdf'))->>'resource_id')::uuid;
  perform pg_temp.confirm(intent,admin_id,sid);
  select * into slot from public.deliverables where id=slot.id;
  perform pg_temp.command(org,'ApproveVersion',jsonb_build_object('deliverable_id',slot.id,
   'version_id',slot.current_version_id,'expected_revision',slot.revision));
  result:=public.h07_query(org,'company_indicators',scope);
  return next extensions.is(result#>>'{data,rows,0,approved}',case when slot.display_order=1 then '0' else '1' end,
   'partial approval stays incomplete until all required files are approved');
 end loop;
 delete from auth.sessions where id=client_sid;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',assistant,'role','authenticated','session_id',client_sid)::text,true);
 result:=public.h07_query(org,'pending_deliveries',scope);
 return next extensions.is(result->>'ok','false','revoked session rejected before returning pending files');
 perform set_config('request.jwt.claims','{"role":"anon"}',true);
 result:=public.h07_query(org,'company_indicators',scope);
 return next extensions.is(result#>>'{ok}','false','anonymous caller rejected');
end $$;
select * from pg_temp.h11_suite();
select * from extensions.finish();
rollback;
