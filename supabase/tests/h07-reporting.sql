-- Executed with --local only. Everything, including uploaded metadata, rolls back.
begin;
\ir helpers/auth-session.psql
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();
create function pg_temp.expect(value boolean,label text) returns void language plpgsql as $$ begin if value is distinct from true then raise exception 'H07: %',label; end if; end $$;
create function pg_temp.command(org uuid,op text,input jsonb) returns jsonb language plpgsql as $$ declare r jsonb; begin r:=public.h03_command(org,gen_random_uuid(),op,input); if r->>'ok'<>'true' then raise exception 'H07 %: %',op,r; end if; return r->'data'; end $$;
create function pg_temp.check_drilldown(org uuid,filters jsonb) returns void language plpgsql as $$
declare original jsonb; narrowed jsonb; criterion text; expected integer; upcoming integer;
begin
  original:=public.h07_query(org,'report',filters||'{"pageSize":500}');
  perform pg_temp.expect(original->>'ok'='true','base query admitted');
  select coalesce((settings->>'upcoming_days')::integer,7) into upcoming from public.organizations where id=org;
  foreach criterion in array array['pending','review','observed','overdue','upcoming'] loop
    narrowed:=public.h07_query(org,'report',filters||jsonb_build_object('pageSize',500,'indicators',coalesce(filters->'indicators','[]'::jsonb)||jsonb_build_array(criterion)));
    select count(*) into expected from jsonb_array_elements(original->'data'->'rows') r
    where case criterion
      when 'pending' then r->>'disposition'='active' and r->>'state'<>'aprobado'
      when 'review' then r->>'disposition'='active' and (r->>'review_files')::integer>0
      when 'observed' then r->>'disposition'='active' and (r->>'observed_count')::integer>0
      when 'overdue' then (r->>'overdue')::boolean
      when 'upcoming' then r->>'disposition'='active' and (r->>'operational_due_date')::date between (now() at time zone 'America/Lima')::date and (now() at time zone 'America/Lima')::date+upcoming
    end;
    perform pg_temp.expect(narrowed->>'ok'='true' and (narrowed->'data'->>'count')::integer=expected,'drilldown count intersects '||criterion||' with '||filters::text);
    perform pg_temp.expect(not exists(select 1 from jsonb_array_elements(narrowed->'data'->'rows') r
      where not exists(select 1 from jsonb_array_elements(original->'data'->'rows') source where source->>'id'=r->>'id')),'drilldown never widens the original result');
  end loop;
end $$;
\ir helpers/document-upload.psql
do $$
declare org uuid:=gen_random_uuid(); actor uuid:=gen_random_uuid(); limited uuid:=gen_random_uuid(); sid uuid:=gen_random_uuid(); company uuid; other_company uuid; dtype uuid; member uuid; role_id uuid;
  rule uuid; obligation uuid; first_obligation uuid; partial_obligation uuid; input jsonb; result jsonb; exported jsonb; slot public.deliverables; cycle uuid; intent uuid;
  today date:=(now() at time zone 'America/Lima')::date; req uuid:=gen_random_uuid(); initial_hash text;
  audit_grant uuid; expected_reviews integer; history_hash text; report_kind text; prior_indicator text;
begin
  insert into auth.users(id,email) values(actor,'h07-'||actor||'@example.test'),(limited,'h07-'||limited||'@example.test');
  insert into public.profiles(user_id,email,full_name,provisioning_status) select id,email,'H07 SQL fixture','ready' from auth.users where id in (actor,limited);
  insert into public.organizations(id,name) values(org,'H07 SQL Docker');
  insert into public.organization_members(organization_id,user_id,member_type,is_admin) values(org,actor,'internal',true) returning id into member;
  insert into public.organization_members(organization_id,user_id,member_type) values(org,limited,'internal');
  insert into public.companies(organization_id,ruc,legal_name,control_start_date) values(org,'20999999771','H07 1/1',today) returning id into company;
  insert into public.companies(organization_id,ruc,legal_name,control_start_date) values(org,'20999999772','H07 0/9',today) returning id into other_company;
  insert into public.permissions(organization_id,module,action,description) select org,'tributario',a,a from unnest(array['view','upload','download','approve','observe','reopen','waive','reports.view','reports.export','audit.view']) a;
  insert into public.roles(organization_id,code,name,audience) values(org,'h07','H07','internal') returning id into role_id;
  insert into public.role_permissions(organization_id,role_id,permission_id) select org,role_id,id from public.permissions where organization_id=org;
  insert into public.access_grants(organization_id,member_id,scope,company_id,module,role_id) values(org,member,'company',company,'tributario',role_id),(org,member,'company',other_company,'tributario',role_id);
  insert into public.company_module_settings(organization_id,company_id,module,delivery_responsible_id) values(org,company,'tributario',actor),(org,other_company,'tributario',actor);
  perform pg_temp.authenticate(jsonb_build_object('sub',actor,'role','authenticated','session_id',sid)::text,true);
  dtype:=(pg_temp.command(org,'SaveDocumentType','{"code":"h07","name":"H07 PDT","module":"tributario","suggested_formats":["pdf"],"active":true}')->>'resource_id')::uuid;
  result:=public.h07_query(org,'dashboard','{}');
  perform pg_temp.expect(result->'data'->'metrics'->>'companies'='2' and result->'data'->'metrics'->>'required'='0','companies without obligations and empty denominator');
  for i in 1..13 loop
    input:=jsonb_build_object('document_type_id',dtype,'company_id',case when i=1 then company else other_company end,'title','H07 obligation '||i,'deadline_offset_days',case when i=1 then -30 else 7 end,'is_required',i<>11,
      'allowed_formats','["pdf"]'::jsonb,'max_file_bytes',20000000,'deliverable_specs','[{"position_code":"a","label":"A","display_order":1,"allowed_formats":["pdf"],"max_file_bytes":20000000},{"position_code":"b","label":"B","display_order":2,"allowed_formats":["pdf"],"max_file_bytes":20000000}]'::jsonb);
    rule:=(pg_temp.command(org,'ConfigureRequirement',input)->>'resource_id')::uuid;
    obligation:=(pg_temp.command(org,'GenerateMonthly',jsonb_build_object('rule_id',rule))->>'resource_id')::uuid;
    if i=1 then first_obligation:=obligation; end if;
    if i=2 then partial_obligation:=obligation; end if;
    if i>=12 then
      perform pg_temp.command(org,case when i=12 then 'SetNotApplicable' else 'CancelObligation' end,jsonb_build_object('obligation_id',obligation,'expected_revision',0,'reason','H07 excluded fixture'));
    end if;
    if i<=2 then
      for slot in select * from public.deliverables where obligation_id=obligation order by display_order loop
        select id into cycle from public.submission_cycles where deliverable_id=slot.id and state='open';
        intent:=(pg_temp.command(org,'CreateUploadIntent',jsonb_build_object('deliverable_id',slot.id,'cycle_id',cycle,'expected_revision',slot.revision,'original_name','H07-document.pdf','declared_bytes',200,'declared_mime','application/pdf'))->>'resource_id')::uuid;
        perform pg_temp.confirm(intent,actor,sid);
        select * into slot from public.deliverables where id=slot.id;
        if i=1 or slot.display_order=1 then perform pg_temp.command(org,'ApproveVersion',jsonb_build_object('deliverable_id',slot.id,'version_id',slot.current_version_id,'expected_revision',slot.revision)); end if;
      end loop;
    end if;
  end loop;
  result:=public.h07_query(org,'report','{}');
  perform pg_temp.expect(result->'data'->'metrics'->>'required'='10' and result->'data'->'metrics'->>'approved'='1','1/1 plus 0/9 = 1/10; optional, cancelled, waived excluded');
  perform pg_temp.expect((select approved_count=1 and total_count=2 and not approved and not overdue and operational_due_date is null and review_files=1 from private.h07_facts where id=partial_obligation),'partial approval and timely delivery awaiting review');
  perform pg_temp.expect(result->'data'->'metrics'->>'review_files'='1','files unit differs from obligations');
  perform pg_temp.expect((select approved and not overdue and operational_due_date is null and late_cycles=2 from private.h07_facts where id=first_obligation),'late deliveries remain historical after approval without an open overdue cycle');
  perform pg_temp.expect((public.h07_query(org,'dashboard','{}')->'data'->'metrics')=result->'data'->'metrics','dashboard and reports reconcile');
  perform pg_temp.expect((public.h07_query(org,'documents','{"q":"H07-document"}')->'data'->>'count')='4','filename metadata search across versions');
  perform pg_temp.expect((public.h07_query(org,'report','{"indicator":"review"}')->'data'->>'count')='1','indicator drilldown preserves units');
  perform pg_temp.check_drilldown(org,'{"report":"observed"}');
  perform pg_temp.expect(public.h07_query(org,'report','{"indicators":"review"}')->'error'->>'code'='VALIDATION_ERROR','indicator string rejected');
  perform pg_temp.expect(public.h07_query(org,'report','{"indicators":[null]}')->'error'->>'code'='VALIDATION_ERROR','null indicator rejected');
  perform pg_temp.expect(public.h07_query(org,'report','{"indicators":["sql"]}')->'error'->>'code'='VALIDATION_ERROR','unknown predicate rejected');
  perform pg_temp.expect(public.h07_query(org,'report','{"indicators":["review","review","review","review","review","review"]}')->'error'->>'code'='VALIDATION_ERROR','oversized predicate array rejected');
  exported:=public.h07_export(org,req,'start','{"format":"xlsx","filters":{}}');
  perform pg_temp.expect(exported->>'ok'='true' and exported->'data'->>'count'='13','export start derives actual count');
  perform pg_temp.expect(public.h07_export(org,req,'start','{"format":"xlsx","filters":{}}')=exported,'idempotent export reservation');
  perform pg_temp.expect(public.h07_export(org,req,'finish','{"outcome":"generated","row_count":1}')->'error'->>'code'='CONFLICT','partial export rejected');
  result:=public.h07_export(org,req,'finish','{"outcome":"generated","row_count":13}');
  perform pg_temp.expect(result->>'ok'='true','complete export recorded');
  perform pg_temp.expect(public.h07_export(org,req,'finish','{"outcome":"generated","row_count":13}')=result,'finish idempotent');
  perform pg_temp.expect((select count(*)=1 from public.audit_events where organization_id=org and request_id=req),'single export audit event');
  req:=gen_random_uuid(); perform public.h07_export(org,req,'start','{"format":"pdf","filters":{}}');
  perform public.h07_export(org,req,'finish','{"outcome":"cancelled"}');
  perform pg_temp.expect(public.h07_export(org,req,'start','{"format":"pdf","filters":{}}')->'data'->>'outcome'='cancelled','late start replay cannot reopen a cancelled export');
  perform pg_temp.expect(public.h07_export(org,req,'finish','{"outcome":"generated","row_count":13}')->'error'->>'code'='CONFLICT','late generation cannot overwrite terminal cancellation');
  perform pg_temp.expect((select metadata->>'outcome'='cancelled' and metadata->>'row_count'='0' from public.audit_events where request_id=req),'cancel is never success');
  result:=public.h07_query(org,'audit','{"action":"GenerateReport"}');
  perform pg_temp.expect(result->'data'->>'count'='2' and position('reference_salary' in result::text)=0 and position('password' in result::text)=0,'audit projected minimally');
  initial_hash:=(public.h07_query(org,'report','{}')->'data'->>'fingerprint');
  select * into slot from public.deliverables where obligation_id=first_obligation order by display_order limit 1;
  perform pg_temp.command(org,'ReopenApproved',jsonb_build_object('deliverable_id',slot.id,'version_id',slot.current_version_id,'expected_revision',slot.revision,'comment','H07 historical search','new_due_date',today+2));
  perform pg_temp.expect(exists(select 1 from jsonb_array_elements(public.h07_query(org,'documents','{}')->'data'->'rows') r where (r->>'id')::uuid=slot.current_version_id and r->>'is_current'='false'),'reopened prior version remains searchable as historical');
  perform pg_temp.command(org,'RequestDownload',jsonb_build_object('version_id',slot.current_version_id));
  select * into slot from public.deliverables where obligation_id=partial_obligation and review_state='por_revisar';
  perform pg_temp.command(org,'ObserveVersion',jsonb_build_object('deliverable_id',slot.id,'version_id',slot.current_version_id,'expected_revision',slot.revision,'comment','H07 audit correction','new_due_date',today+2));
  select * into slot from public.deliverables where id=slot.id;
  select id into cycle from public.submission_cycles where deliverable_id=slot.id and state='open';
  intent:=(pg_temp.command(org,'CreateUploadIntent',jsonb_build_object('deliverable_id',slot.id,'cycle_id',cycle,'expected_revision',slot.revision,'original_name','H07-corrected.pdf','declared_bytes',200,'declared_mime','application/pdf'))->>'resource_id')::uuid;
  perform pg_temp.confirm(intent,actor,sid);
  select * into slot from public.deliverables where id=slot.id;
  perform pg_temp.command(org,'ApproveVersion',jsonb_build_object('deliverable_id',slot.id,'version_id',slot.current_version_id,'expected_revision',slot.revision));
  select md5(string_agg(to_jsonb(a)::text,'' order by a.id)) into history_hash from public.audit_events a where a.organization_id=org;
  select count(*) into expected_reviews from public.audit_events a join public.deliverables d on d.id=a.resource_id and d.organization_id=a.organization_id and a.resource_table='deliverables'
    join public.obligations o on o.id=d.obligation_id and o.organization_id=d.organization_id where a.organization_id=org and o.company_id=company;
  result:=public.h07_query(org,'audit',jsonb_build_object('company_id',company,'module','tributario','resource','deliverables'));
  perform pg_temp.expect((result->'data'->>'count')::integer=expected_reviews and expected_reviews=3,'audit includes approvals and reopen under their company/module');
  perform pg_temp.expect(public.h07_query(org,'audit',jsonb_build_object('company_id',other_company,'action','ObserveVersion'))->'data'->>'count'='1','audit includes observation in the second company');
  perform pg_temp.expect(public.h07_query(org,'audit',jsonb_build_object('company_id',company,'action','RequestDownload'))->'data'->>'count'='1','audit resolves historical downloads through version and deliverable');
  insert into public.access_grants(organization_id,member_id,scope,company_id,module,role_id)
    select org,id,'company',company,'tributario',role_id from public.organization_members where organization_id=org and user_id=limited returning id into audit_grant;
  perform pg_temp.authenticate(jsonb_build_object('sub',limited,'role','authenticated','session_id',gen_random_uuid())::text,true);
  perform pg_temp.expect(public.h07_query(org,'audit',jsonb_build_object('company_id',company,'module','tributario','resource','deliverables'))->'data'->>'count'='3','authorized supervisor sees reviews with company/module filters');
  perform pg_temp.expect(public.h07_query(org,'audit',jsonb_build_object('company_id',company,'action','RequestDownload'))->'data'->>'count'='1','authorized supervisor sees historical download');
  perform pg_temp.expect(public.h07_query(org,'audit',jsonb_build_object('company_id',other_company))->'data'->>'count'='0','supervisor cannot see another company audit');
  perform pg_temp.expect(public.h07_query(org,'audit',jsonb_build_object('company_id',company,'module','laboral_general'))->'data'->>'count'='0','a grant in one module does not expose another');
  perform pg_temp.authenticate(jsonb_build_object('sub',actor,'role','authenticated','session_id',sid)::text,true);
  update public.companies set deleted_at=now(),deleted_by=actor,deletion_reason='H07 audit history' where id=company;
  perform pg_temp.expect(public.h07_query(org,'audit',jsonb_build_object('company_id',company,'resource','deliverables'))->'data'->>'count'='0','deleted company audit excluded operationally');
  result:=public.h07_query(org,'audit',jsonb_build_object('company_id',company,'resource','deliverables','include_deleted',true));
  perform pg_temp.expect(result->'data'->>'count'='3' and result->'data'->'rows'->0->>'record_status'='deleted','admin can query deleted company review history');
  update public.companies set deleted_at=null,deleted_by=null,deletion_reason=null where id=company;
  perform pg_temp.expect((select md5(string_agg(to_jsonb(a)::text,'' order by a.id))=history_hash from public.audit_events a where a.organization_id=org),'scope queries preserve immutable original audit events');
  update public.access_grants set deleted_at=now(),deleted_by=actor,deletion_reason='H07 restore limited fixture' where id=audit_grant;
  initial_hash:=(public.h07_query(org,'report','{}')->'data'->>'fingerprint');
  update public.companies set status='inactive' where id=other_company;
  perform pg_temp.expect(public.h07_query(org,'report','{}')->'data'->>'count'='1','inactive ancestor excluded operationally');
  result:=public.h07_query(org,'report','{"include_deleted":true}');
  perform pg_temp.expect(result->'data'->>'count'='13' and exists(select 1 from jsonb_array_elements(result->'data'->'rows') r where r->>'record_status'='inactive'),'admin historical inactive labelled');
  update public.companies set deleted_at=now(),deleted_by=actor,deletion_reason='H07 history' where id=other_company;
  perform pg_temp.expect(exists(select 1 from jsonb_array_elements(public.h07_query(org,'report','{"include_deleted":true}')->'data'->'rows') r where r->>'record_status'='deleted'),'deleted ancestor labelled without rewriting obligations');
  update public.companies set deleted_at=null,deleted_by=null,deletion_reason=null,status='active' where id=other_company;
  perform pg_temp.expect((public.h07_query(org,'report','{}')->'data'->>'fingerprint')=initial_hash,'restoration preserves historical documentary data');
  perform pg_temp.authenticate(jsonb_build_object('sub',limited,'role','authenticated','session_id',gen_random_uuid())::text,true);
  perform pg_temp.expect(public.h07_query(org,'report','{"include_deleted":true}')->'error'->>'code'='FORBIDDEN','historical flag is not authorization');
  perform pg_temp.expect(public.h07_query(org,'report','{}')->'data'->>'count'='0','no grants means no visible report rows');
  perform pg_temp.expect(public.h07_export(org,gen_random_uuid(),'start','{"format":"xlsx","filters":{}}')->'error'->>'code'='FORBIDDEN','export permission required');
  perform pg_temp.expect(public.h07_query(org,'report','{"sql":"select secret"}')->'error'->>'code'='VALIDATION_ERROR','unknown filter rejected');
  perform pg_temp.authenticate(jsonb_build_object('sub',actor,'role','authenticated','session_id',sid)::text,true);
  update public.profiles set enabled=false where user_id=limited;
  perform pg_temp.authenticate(jsonb_build_object('sub',limited,'role','authenticated','session_id',gen_random_uuid())::text,true);
  perform pg_temp.expect(public.h07_query(org,'dashboard','{}')->'error'->>'code'='FORBIDDEN','disabled account rejected');
  -- Mixed file states in one obligation, plus the existing pending/approved/waived/cancelled examples.
  perform pg_temp.authenticate(jsonb_build_object('sub',actor,'role','authenticated','session_id',sid)::text,true);
  rule:=(pg_temp.command(org,'ConfigureRequirement',jsonb_build_object('document_type_id',dtype,'company_id',other_company,'title','H07 mixed review/observed','deadline_offset_days',7,'is_required',true,
    'allowed_formats','["pdf"]'::jsonb,'max_file_bytes',20000000,'deliverable_specs','[{"position_code":"a","label":"A","display_order":1,"allowed_formats":["pdf"],"max_file_bytes":20000000},{"position_code":"b","label":"B","display_order":2,"allowed_formats":["pdf"],"max_file_bytes":20000000}]'::jsonb))->>'resource_id')::uuid;
  obligation:=(pg_temp.command(org,'GenerateMonthly',jsonb_build_object('rule_id',rule))->>'resource_id')::uuid;
  for slot in select * from public.deliverables where obligation_id=obligation order by display_order loop
    select id into cycle from public.submission_cycles where deliverable_id=slot.id and state='open';
    intent:=(pg_temp.command(org,'CreateUploadIntent',jsonb_build_object('deliverable_id',slot.id,'cycle_id',cycle,'expected_revision',slot.revision,'original_name','H07-mixed.pdf','declared_bytes',200,'declared_mime','application/pdf'))->>'resource_id')::uuid;
    perform pg_temp.confirm(intent,actor,sid);
    select * into slot from public.deliverables where id=slot.id;
    if slot.display_order=1 then
      perform pg_temp.command(org,'ObserveVersion',jsonb_build_object('deliverable_id',slot.id,'version_id',slot.current_version_id,'expected_revision',slot.revision,'comment','H07 intersection fixture','new_due_date',today+2));
    end if;
  end loop;
  perform pg_temp.expect(public.h07_query(org,'report','{"indicators":["observed","review"]}')->'data'->>'count'='1','review and observation may belong to different files of the same obligation');
  foreach report_kind in array array['detail','compliance','pending','deadlines','observed','period'] loop
    perform pg_temp.check_drilldown(org,jsonb_build_object('report',report_kind));
    foreach prior_indicator in array array['review','overdue','upcoming','observed'] loop
      perform pg_temp.check_drilldown(org,jsonb_build_object('report',report_kind,'indicator',prior_indicator,'company_id',other_company,'module','tributario','period',to_char(today,'YYYY-MM')));
    end loop;
  end loop;
  result:=public.h07_export(org,gen_random_uuid(),'start','{"format":"xlsx","filters":{"report":"observed","indicators":["pending","review"]}}');
  perform pg_temp.expect(result->>'ok'='true' and result->'data'->>'count'='1' and result->'data'->'filters'->'indicators'='["pending","review"]'::jsonb,'export reservation keeps intersected report filters');
  update public.profiles set enabled=true where user_id=limited;
  update public.access_grants set deleted_at=null,deleted_by=null,deletion_reason=null where id=audit_grant;
  perform pg_temp.authenticate(jsonb_build_object('sub',limited,'role','authenticated','session_id',gen_random_uuid())::text,true);
  perform pg_temp.check_drilldown(org,jsonb_build_object('company_id',company,'module','tributario','report','observed'));
  perform pg_temp.expect(public.h07_query(org,'report',jsonb_build_object('company_id',other_company,'indicators','["review","observed"]'::jsonb))->'data'->>'count'='0','combined indicators never grant another company');
  insert into public.grant_permission_overrides(organization_id,grant_id,permission_id,allowed)
    select org,audit_grant,id,false from public.permissions where organization_id=org and action='reports.view';
  perform pg_temp.expect(not exists(select 1 from private.h07_rows(org,limited,jsonb_build_object('company_id',company),'reports.export')),'export still requires both view and export permissions');
end $$;
select extensions.pass('H07 reconciliation, review, exports, history, metadata and audit contracts');
select * from extensions.finish();
rollback;
