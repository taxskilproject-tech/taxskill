-- Docker only; all fixture writes roll back.
begin;
\ir helpers/auth-session.psql
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();
create function pg_temp.ux_expect(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'UX configuration: %',label; end if; end $$;
create function pg_temp.ux_command(org uuid,op text,input jsonb) returns jsonb language plpgsql as $$
declare response jsonb;
begin
  response:=public.h03_command(org,gen_random_uuid(),op,input);
  if response->>'ok'<>'true' then raise exception 'UX fixture operation failed: %',response->'error'; end if;
  return response->'data';
end $$;
do $$
declare
  org uuid:=gen_random_uuid(); other_org uuid:=gen_random_uuid(); actor uuid:=gen_random_uuid(); client_user uuid:=gen_random_uuid();
  company uuid; second_company uuid; dtype uuid; needle_type uuid; result jsonb; rule_input jsonb;
begin
  insert into auth.users(id,email) values(actor,'ux-admin-'||actor||'@example.test'),(client_user,'ux-client-'||client_user||'@example.test');
  insert into public.profiles(user_id,email,full_name,provisioning_status) select id,email,'UX local fixture','ready' from auth.users where id in(actor,client_user);
  insert into public.organizations(id,name) values(org,'UX Docker'),(other_org,'UX other organization');
  insert into public.organization_members(organization_id,user_id,member_type,is_admin) values(org,actor,'internal',true),(org,client_user,'client',false);
  insert into public.companies(organization_id,ruc,legal_name,control_start_date) values(org,'20999999881','UX Primera',current_date) returning id into company;
  insert into public.companies(organization_id,ruc,legal_name,control_start_date) values(org,'20999999882','UX Segunda',current_date) returning id into second_company;
  perform pg_temp.authenticate(jsonb_build_object('sub',actor,'role','authenticated','session_id',gen_random_uuid())::text,true);
  perform public.h02_context();
  for i in 1..30 loop
    dtype:=(pg_temp.ux_command(org,'SaveDocumentType',jsonb_build_object('code','ux_type_'||i,'name','A Type '||lpad(i::text,2,'0'),'module','tributario','suggested_formats',jsonb_build_array('pdf'),'active',true))->>'resource_id')::uuid;
  end loop;
  needle_type:=(pg_temp.ux_command(org,'SaveDocumentType','{"code":"ux_needle","name":"Z _needle%","module":"laboral_general","suggested_formats":["pdf"],"active":false}')->>'resource_id')::uuid;
  result:=public.h03_query(org,'catalog','{}');
  perform pg_temp.ux_expect(result->>'ok'='true' and (result#>>'{data,count}')::int=31 and jsonb_array_length(result#>'{data,rows}')=25,'default catalog shape and pagination');
  result:=public.h03_query(org,'catalog','{"q":"_needle%"}');
  perform pg_temp.ux_expect((result#>>'{data,count}')::int=1 and result#>>'{data,rows,0,id}'=needle_type::text,'literal search finds a result beyond the first page');
  perform pg_temp.ux_expect((public.h03_query(org,'catalog','{"q":"_needle%","active":true}')#>>'{data,count}')::int=0,'catalog state intersects search');
  perform pg_temp.ux_expect((public.h03_query(org,'catalog','{"module":"laboral_general","active":false}')#>>'{data,count}')::int=1,'module and state intersect');
  perform pg_temp.ux_expect((public.h03_query(other_org,'catalog','{}')->>'ok')='false','another study is denied');
  perform pg_temp.ux_expect((public.h03_query(org,'catalog','{"module":"invalid"}')#>>'{error,code}')='VALIDATION_ERROR','invalid module rejected');
  rule_input:=jsonb_build_object('company_id',company,'document_type_id',dtype,'title','Ordinary rule','frequency','mensual','deadline_offset_days',0,'inherit_responsible',true,'active',false,'allowed_formats',jsonb_build_array('pdf'),'max_file_bytes',20000000,'deliverable_specs','[{"position_code":"file_1","label":"Original","display_order":1,"allowed_formats":["pdf"],"max_file_bytes":20000000}]'::jsonb);
  for i in 1..30 loop perform pg_temp.ux_command(org,'ConfigureRequirement',rule_input||jsonb_build_object('title','Rule '||i)); end loop;
  perform pg_temp.ux_command(org,'ConfigureRequirement',rule_input||jsonb_build_object('company_id',second_company,'title','Unique needle rule'));
  result:=public.h03_query(org,'rules','{"q":"Unique needle"}');
  perform pg_temp.ux_expect((result#>>'{data,count}')::int=1 and result#>>'{data,rows,0,company_id}'=second_company::text,'rule search precedes pagination');
  perform pg_temp.ux_expect((public.h03_query(org,'rules',jsonb_build_object('company_id',company,'q','Unique needle'))#>>'{data,count}')::int=0,'company filter intersects rule search');
  perform pg_temp.ux_expect((public.h03_query(org,'rules','{"module":"laboral_general"}')#>>'{data,count}')::int=0,'rule module filter');
  perform pg_temp.ux_expect((public.h03_query(org,'rules','{"active":false}')#>>'{data,count}')::int=31,'draft rules retained');
  perform pg_temp.ux_expect(jsonb_array_length(public.h03_query(org,'rules','{"q":"Unique needle","page":2}')#>'{data,rows}')=0,'filtered pagination is not applied after download');
  perform pg_temp.ux_expect((public.h03_query(org,'rules','{"page":1000001}')#>>'{error,code}')='VALIDATION_ERROR','excessive page rejected');
  perform pg_temp.ux_command(org,'DeleteDocumentEntity',jsonb_build_object('entity','document_types','id',needle_type,'expected_revision',(select revision from public.document_types where id=needle_type),'reason','Local UX test'));
  perform pg_temp.ux_expect((public.h03_query(org,'catalog','{"q":"_needle%"}')#>>'{data,count}')::int=0,'soft-deleted catalog is excluded');
  perform pg_temp.ux_expect((public.h03_query(org,'catalog','{"q":"_needle%","include_deleted":true}')#>>'{data,count}')::int=1,'history remains searchable explicitly');
  perform pg_temp.authenticate(jsonb_build_object('sub',client_user,'role','authenticated','session_id',gen_random_uuid())::text,true);
  perform public.h02_context();
  perform pg_temp.ux_expect(public.h03_query(org,'catalog','{}')->>'ok'='false','client cannot query administrative catalog');
  perform pg_temp.ux_expect(public.h03_query(org,'rules','{}')->>'ok'='false','client cannot query administrative rules');
end $$;
select extensions.ok(true,'UX configuration: 16 pagination, filter, history and authorization assertions');
select * from extensions.finish();
rollback;
