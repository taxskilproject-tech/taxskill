-- Docker only. Fixture data, fault injection and technical progress are all rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();
create temporary table digest_fixture(org uuid,company uuid,recipient uuid,obligation uuid,n integer);
do $$
declare v_org uuid; v_company uuid; v_role uuid; v_user uuid; v_member uuid; v_obligation uuid; v_slot uuid; v_period uuid; i integer; j integer;
begin
  for j in 1..2 loop
    insert into public.organizations(name) values('Digest preparation Docker') returning id into v_org;
    insert into public.companies(organization_id,ruc,legal_name,control_start_date) values(v_org,'20999999660','Digest Docker',current_date) returning id into v_company;
    insert into public.permissions(organization_id,module,action,description) select v_org,'actividades',a,a from unnest(array['view','upload']) a;
    insert into public.roles(organization_id,code,name,audience) values(v_org,'digest','Digest','internal') returning id into v_role;
    insert into public.role_permissions(organization_id,role_id,permission_id) select v_org,v_role,id from public.permissions where organization_id=v_org;
    insert into public.periods(organization_id,kind,period_key,start_date,end_date) values(v_org,'daily',current_date::text,current_date,current_date) returning id into v_period;
    update public.organizations set settings=jsonb_set(settings,'{digest_local_time}','"00:00"') where id=v_org;
    for i in 1..6 loop
      v_user:=gen_random_uuid();
      insert into auth.users(id,email) values(v_user,'digest-'||v_user||'@example.test');
      insert into public.profiles(user_id,email,full_name,provisioning_status,whatsapp_phone) values(v_user,'digest-'||v_user||'@example.test','Docker digest','ready','+15005550006');
      insert into public.organization_members(organization_id,user_id,member_type) values(v_org,v_user,'internal') returning id into v_member;
      insert into public.access_grants(organization_id,member_id,company_id,scope,module,role_id) values(v_org,v_member,v_company,'company','actividades',v_role);
      insert into public.obligations(organization_id,class,company_id,module,period_id,destination_key,occurrence_key,manual_request_id,title,initial_due_date,delivery_responsible_id,snapshot)
      values(v_org,'additional',v_company,'actividades',v_period,'company:'||v_company,'digest:'||v_user,gen_random_uuid(),'Docker digest',current_date,v_user,
        jsonb_build_object('schema_version',1,'module','actividades','initial_due_date',current_date)) returning id into v_obligation;
      insert into public.deliverables(organization_id,obligation_id,position_code,label,display_order) values(v_org,v_obligation,'file','File',1) returning id into v_slot;
      insert into public.submission_cycles(organization_id,deliverable_id,cycle_number,reason,due_date) values(v_org,v_slot,1,'initial',current_date);
      insert into digest_fixture values(v_org,v_company,v_user,v_obligation,j);
    end loop;
  end loop;
end $$;
set local request.jwt.claims='{"role":"service_role"}';
select set_config('digest.org',(select org::text from digest_fixture where n=1 limit 1),true);
select set_config('digest.other',(select org::text from digest_fixture where n=2 limit 1),true);
select extensions.ok((public.h08_health(current_setting('digest.org')::uuid)->'data'->>'digest_pending_since') is not null,'health observes preparation before its first cursor exists');
select extensions.throws_ok(format('select public.h06_prepare_digests(''https://app.example.test'',current_date,now(),%L,0)',current_setting('digest.org')),'P0001','VALIDATION_ERROR','rejects an invalid page size');
create temporary table digest_page as select public.h06_prepare_digests('https://app.example.test',current_date,now(),current_setting('digest.org')::uuid,2) result;
select extensions.is((select result->>'prepared_count' from digest_page),'2','preparation commits only one bounded page');
select extensions.is((select count(*)::integer from public.whatsapp_digests where organization_id=current_setting('digest.org')::uuid),2,'first page persists two recipients');
select extensions.ok((select last_recipient_id is not null from private.h06_digest_progress where organization_id=current_setting('digest.org')::uuid),'page cursor is durable');
select public.h06_prepare_digests('https://app.example.test',current_date,now(),current_setting('digest.org')::uuid,2);
select public.h06_prepare_digests('https://app.example.test',current_date,now(),current_setting('digest.org')::uuid,2);
select extensions.is((select count(*)::integer from public.whatsapp_digests where organization_id=current_setting('digest.org')::uuid),6,'later pages continue without duplicate recipients');
create temporary table frozen_digests as select id,payload from public.whatsapp_digests where organization_id=current_setting('digest.org')::uuid;
select extensions.is(public.h06_prepare_digests('https://app.example.test',current_date,now(),current_setting('digest.org')::uuid,2)->>'prepared_count','0','replay has no new daily payload');
select extensions.ok(not exists(select 1 from frozen_digests f join public.whatsapp_digests d using(id) where f.payload<>d.payload),'replay preserves every frozen payload');
select extensions.is((select count(*)::integer from public.whatsapp_digests where organization_id=current_setting('digest.other')::uuid),0,'scoped page does not prepare another study');

-- One recipient fails while a second recipient in the same page succeeds.
select set_config('digest.failure',(select recipient::text from digest_fixture where n=2 order by recipient limit 1),true);
create function pg_temp.reject_digest() returns trigger language plpgsql as $$ begin
  if new.recipient_id=current_setting('digest.failure')::uuid then raise exception 'injected local preparation failure'; end if; return new;
end $$;
create trigger digest_injected_failure before insert on public.whatsapp_digests for each row execute function pg_temp.reject_digest();
create temporary table failed_page as select public.h06_prepare_digests('https://app.example.test',current_date,now(),current_setting('digest.other')::uuid,2) result;
select extensions.is((select result->>'status' from failed_page),'failed','per-recipient failure remains explicit');
select extensions.is((select result->>'prepared_count' from failed_page),'1','one failed recipient does not roll back its successful neighbor');
select extensions.is((select failed_recipient_id::text from private.h06_digest_progress where organization_id=current_setting('digest.other')::uuid),current_setting('digest.failure'),'failed recipient remains available for recovery');
select extensions.is(public.h08_health(current_setting('digest.other')::uuid)->'data'->>'automation_failures','1','preparation failure reaches the shared health diagnostic');
drop trigger digest_injected_failure on public.whatsapp_digests;
select public.h06_prepare_digests('https://app.example.test',current_date,now(),current_setting('digest.other')::uuid,10);
select public.h06_prepare_digests('https://app.example.test',current_date,now(),current_setting('digest.other')::uuid,10);
select extensions.is((select count(*)::integer from public.whatsapp_digests where organization_id=current_setting('digest.other')::uuid),6,'next sweep recovers the failed earlier recipient');
select extensions.ok((select error_code is null from private.h06_digest_progress where organization_id=current_setting('digest.other')::uuid),'successful retry clears the technical failure');

-- Expiration is bounded too; ambiguous/accepted payloads remain reserved.
insert into public.whatsapp_digests(organization_id,recipient_id,local_date,delivery_id,payload)
select d.organization_id,d.recipient_id,current_date-i,v.id,jsonb_set(jsonb_set(d.payload,'{delivery_id}',to_jsonb(v.id::text)),'{local_date}',to_jsonb((current_date-i)::text))
from (select * from public.whatsapp_digests where organization_id=current_setting('digest.org')::uuid limit 1) d
cross join generate_series(1,103) i cross join lateral(select gen_random_uuid() id where i>0) v;
create temporary table expired_page as select public.h06_prepare_digests('https://app.example.test',current_date,now(),current_setting('digest.org')::uuid,2) result;
select extensions.is((select result->>'expired_count' from expired_page),'100','one invocation expires at most 100 stale payloads');
select extensions.is((select result->>'status' from expired_page),'pending','expiration backlog remains pending');
select public.h06_prepare_digests('https://app.example.test',current_date,now(),current_setting('digest.org')::uuid,2);
select extensions.is((select count(*)::integer from public.whatsapp_digests where organization_id=current_setting('digest.org')::uuid and local_date<current_date and expired_at is null),0,'expiration continues on the following page');
select extensions.ok(not has_table_privilege('authenticated','private.h06_digest_progress','SELECT'),'browser cannot read technical cursors');
select extensions.ok(not has_function_privilege('authenticated','public.h06_prepare_digests(text,date,timestamptz,uuid,integer)','EXECUTE'),'preparation is service-only');

-- Two ready studies rotate even when other local fixtures remain active.
insert into private.h06_digest_progress(organization_id,scan_date,last_attempt_at)
select id,current_date,now() from public.organizations on conflict(organization_id) do update set last_attempt_at=now();
update private.h06_digest_progress set last_attempt_at=case when organization_id=current_setting('digest.org')::uuid then '2000-01-01'::timestamptz else '2001-01-01'::timestamptz end
where organization_id in(current_setting('digest.org')::uuid,current_setting('digest.other')::uuid);
select extensions.is(public.h06_prepare_digests('https://app.example.test',current_date+1,now()+interval '1 day',null,1)->>'organization_id',current_setting('digest.org'),'global preparation selects the oldest attempted study');
select extensions.is(public.h06_prepare_digests('https://app.example.test',current_date+1,now()+interval '1 day',null,1)->>'organization_id',current_setting('digest.other'),'the following invocation rotates to the other study');
update public.companies set status='inactive' where organization_id=current_setting('digest.org')::uuid;
select extensions.is(public.h06_prepare_digests('https://app.example.test',current_date+2,now()+interval '2 days',current_setting('digest.org')::uuid,10)->>'prepared_count','0','inactive company creates no new digest');
update public.companies set status='active' where organization_id=current_setting('digest.org')::uuid;
update public.profiles set whatsapp_phone=null where user_id in(select recipient from digest_fixture where n=1);
select extensions.is(public.h06_prepare_digests('https://app.example.test',current_date+3,now()+interval '3 days',current_setting('digest.org')::uuid,10)->>'prepared_count','0','missing contacts never fabricate a send');
update public.profiles set whatsapp_phone='+15005550006' where user_id in(select recipient from digest_fixture where n=1);
select extensions.is(public.h06_prepare_digests('https://app.example.test',current_date+3,now()+interval '3 days',current_setting('digest.org')::uuid,10)->>'prepared_count','6','restoring contacts in the same day remains recoverable');
select * from extensions.finish();
rollback;
