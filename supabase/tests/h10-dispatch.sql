-- Ejecutar exclusivamente mediante scripts/verify-h10-dispatch-sql.ts: Docker H09, transacción con rollback.
begin;
set local request.jwt.claims='{"role":"service_role"}';
create function pg_temp.h10_assert(condition boolean,label text) returns void language plpgsql as $$
begin
 if condition is not true then raise exception '%',label; end if;
 perform set_config('taxskill.h10_checks',(coalesce(nullif(current_setting('taxskill.h10_checks',true),''),'0')::int+1)::text,true);
end $$;

do $$
declare
 conn public.sunat_connections; job_id uuid; second_id uuid; daily_id uuid; next_id uuid;
 lease_id uuid; ticket jsonb; token uuid; prefix text:='dispatch-sql-'||gen_random_uuid()::text;
 records jsonb; expected_checkpoint jsonb; baseline timestamptz; notices_before bigint; notices_after bigint; rejected boolean;
 request_id bigint; request_headers jsonb; envelope jsonb; nonce_id uuid; issued bigint;
begin
 if current_setting('taxskill.local_docker_test',true) is distinct from 'h10-dispatch' then raise exception 'LOCAL_DOCKER_GUARD_REQUIRED'; end if;
 if exists(select 1 from public.sunat_jobs where state in ('queued','running')) then raise exception 'LOCAL_QUEUE_BUSY_RETRY_WHEN_IDLE'; end if;
 if exists(select 1 from private.sunat_dispatch_runtime where lease_expires_at>now()) then raise exception 'LOCAL_DISPATCH_BUSY_RETRY_WHEN_IDLE'; end if;
 select s.* into conn from public.sunat_connections s join public.companies c on c.id=s.company_id
  where c.ruc='20000000901' and s.state='connected' and s.deleted_at is null;
 if conn.id is null then raise exception 'IDLE_H09_FIXTURE_REQUIRED'; end if;
 perform pg_temp.h10_assert(not has_table_privilege('anon','private.sunat_dispatch_nonces','select'),'ANON_NONCES_EXPOSED');
 perform pg_temp.h10_assert(not has_table_privilege('authenticated','private.sunat_dispatch_nonces','select'),'MEMBER_NONCES_EXPOSED');
 perform pg_temp.h10_assert(not has_function_privilege('authenticated','public.h10_dispatch_consume_nonce(uuid,bigint)','execute'),'MEMBER_CAN_CONSUME_NONCES');
 perform pg_temp.h10_assert(not has_function_privilege('authenticated','public.h10_dispatch_claim(boolean)','execute'),'MEMBER_CAN_CLAIM_WORK');
 perform pg_temp.h10_assert(not has_function_privilege('anon','public.h10_dispatch_authorize(uuid,uuid)','execute'),'ANON_CAN_AUTHORIZE_WORK');
 perform pg_temp.h10_assert(not has_table_privilege('authenticated','private.sunat_dispatch_settings','select'),'DISPATCH_SETTINGS_EXPOSED');

 job_id:=private.h10_enqueue(conn,'monthly',prefix||'-lease',null,null,'2026-10-01','2026-10-31');
 ticket:=public.h10_dispatch_claim(false); token:=(ticket->>'run_id')::uuid;
 perform pg_temp.h10_assert(ticket#>>'{claim,job,id}'=job_id::text,'DISPATCH_CLAIM_WRONG_JOB');
 perform pg_temp.h10_assert((select lease_expires_at>=now()+interval '300 seconds' from public.sunat_jobs where id=job_id),'STARTUP_LEASE_TOO_SHORT');
 perform pg_temp.h10_assert(public.h10_dispatch_claim(false) is null,'DUPLICATE_DISPATCH_STARTED');
 perform pg_temp.h10_assert(not public.h10_dispatch_finish(gen_random_uuid(),'',true),'FOREIGN_RUN_TOKEN_ACCEPTED');
 perform public.h10_dispatch_finish(token,'SANDBOX_CLEANUP_FAILED',false);
 perform pg_temp.h10_assert((select lease_token=token from private.sunat_dispatch_runtime where id),'UNCONFIRMED_CLOSE_RELEASED_LEASE');
 perform pg_temp.h10_assert(public.h10_dispatch_claim(false) is null,'RUN_STARTED_DURING_UNCONFIRMED_CLOSE');
 perform public.h10_dispatch_finish(token,'',true);
 perform pg_temp.h10_assert((select lease_token is null from private.sunat_dispatch_runtime where id),'CONFIRMED_CLOSE_LEFT_LEASE');

 second_id:=private.h10_enqueue(conn,'monthly',prefix||'-revoked',null,null,'2026-10-01','2026-10-31');
 ticket:=public.h10_dispatch_claim(false); token:=(ticket->>'run_id')::uuid;
 update public.companies set status='inactive' where id=conn.company_id;
 perform pg_temp.h10_assert(public.h10_dispatch_finish(token,'SANDBOX_EXECUTION_FAILED',true),'REVOKED_DISPATCH_NOT_FINALIZED');
 perform pg_temp.h10_assert((select state='failed' and error_code='ACCESS_REVOKED' from public.sunat_jobs where id=second_id),'REVOKED_JOB_NOT_RECORDED');
 perform pg_temp.h10_assert((select lease_token is null from private.sunat_dispatch_runtime where id),'REVOKED_JOB_LEFT_GLOBAL_LEASE');
 update public.companies set status='active' where id=conn.company_id;

 update public.sunat_connections set daily_baseline_at=now(),last_daily_success_at=null where id=conn.id;
 baseline:=now(); daily_id:=gen_random_uuid(); lease_id:=gen_random_uuid();
 insert into public.sunat_jobs(id,organization_id,company_id,connection_id,kind,state,request_key,credential_version,
  from_date,through_date,worker_id,lease_token,lease_expires_at,started_at)
 values(daily_id,conn.organization_id,conn.company_id,conn.id,'daily','running',prefix||'-baseline',conn.credential_version,
  '2026-10-01','2026-10-31',gen_random_uuid(),lease_id,now()+interval '90 seconds',now());
 expected_checkpoint:=jsonb_build_object('messages',jsonb_build_object('schema_version',1,'connection_key',conn.id::text,
  'mailbox','messages','from','2026-10-01','through','2026-10-31','next_page',1,'total',null,'order',null,
  'first_id',null,'last_date',null,'seen_ids','[]'::jsonb,'items','[]'::jsonb,'complete',false));
 records:=jsonb_build_array(jsonb_build_object('id',prefix||'-initial','subject','Registro sintético inicial',
  'published_on','2026-10-15','read',false,'has_attachments',false));
 perform public.h10_worker_batch(daily_id,lease_id,'messages',records,expected_checkpoint,'{}');
 perform pg_temp.h10_assert(not exists(select 1 from public.sunat_notifications n join public.sunat_messages m on m.id=n.message_id
  where m.connection_id=conn.id and m.source_id=prefix||'-initial'),'BASELINE_REPORTED_AS_NEW');
 perform public.h10_worker_finish(daily_id,lease_id,'partial','PAGE_INCONSISTENT',
  '[{"mailbox":"notifications","state":"complete"},{"mailbox":"messages","state":"partial"}]','{}');
 perform pg_temp.h10_assert((select last_daily_success_at is null from public.sunat_connections where id=conn.id),'PARTIAL_DAILY_ADVANCED_SUCCESS');

 daily_id:=gen_random_uuid(); lease_id:=gen_random_uuid();
 insert into public.sunat_jobs(id,organization_id,company_id,connection_id,kind,state,request_key,credential_version,
  from_date,through_date,worker_id,lease_token,lease_expires_at,started_at,created_at)
 values(daily_id,conn.organization_id,conn.company_id,conn.id,'daily','running',prefix||'-next',conn.credential_version,
  '2026-10-01','2026-10-31',gen_random_uuid(),lease_id,now()+interval '90 seconds',now(),clock_timestamp());
 records:=jsonb_build_array(jsonb_build_object('id',prefix||'-new','subject','Registro sintético posterior',
  'published_on','2026-10-15','read',false,'has_attachments',false));
 perform public.h10_worker_batch(daily_id,lease_id,'messages',records,expected_checkpoint,'{}');
 select count(*) into notices_before from public.sunat_notifications n join public.sunat_messages m on m.id=n.message_id
  where m.connection_id=conn.id and m.source_id=prefix||'-new';
 perform pg_temp.h10_assert(notices_before>0,'PARTIAL_BASELINE_BLOCKED_NEW_ALERTS');
 perform public.h10_worker_batch(daily_id,lease_id,'messages',records,expected_checkpoint,'{}');
 select count(*) into notices_after from public.sunat_notifications n join public.sunat_messages m on m.id=n.message_id
  where m.connection_id=conn.id and m.source_id=prefix||'-new';
 perform pg_temp.h10_assert(notices_after=notices_before,'DAILY_ALERT_DUPLICATED');
 perform pg_temp.h10_assert(not exists(select 1 from public.sunat_notifications n join public.sunat_messages m on m.id=n.message_id
  where m.connection_id=conn.id and m.source_id=prefix||'-new' and not private.h10_allowed(conn.organization_id,conn.company_id,n.recipient_id)),
  'DAILY_ALERT_WRONG_RECIPIENT');
 perform public.h10_worker_finish(daily_id,lease_id,'partial','BUDGET_EXHAUSTED',
  '[{"mailbox":"notifications","state":"complete"},{"mailbox":"messages","state":"partial"}]','{}');
 next_id:=private.h10_enqueue(conn,'daily',prefix||'-resume',null,null,'2026-11-01','2026-11-01');
 perform private.h10_prepare_daily_scan(conn,next_id);
 perform pg_temp.h10_assert((select j.checkpoint->>'resume'='true' and j.checkpoint->'messages'=expected_checkpoint->'messages' and j.from_date=date '2026-10-01' and j.through_date=date '2026-11-01'
  from public.sunat_jobs j where j.id=next_id),'DAILY_CURSOR_NOT_CARRIED');
 update public.sunat_jobs set state='cancelled',finished_at=now() where id=next_id;
 update public.sunat_connections set credential_version=credential_version+1 where id=conn.id;
 perform pg_temp.h10_assert((select daily_baseline_at is null from public.sunat_connections where id=conn.id),'ROTATION_RETAINED_BASELINE');

 rejected:=false;
 begin perform public.h10_dispatch_configure('https://example.invalid/dispatch',repeat('a',64),false);
 exception when raise_exception then rejected:=true; end;
 perform pg_temp.h10_assert(rejected,'ARBITRARY_DISPATCH_ENDPOINT_ACCEPTED');
 perform public.h10_dispatch_configure('https://taxskill.vercel.app/api/sunat/dispatch',repeat('a',64),false);
 -- Único destino de la prueba: loopback descartado con el rollback, sin enviar solicitudes.
 update private.sunat_dispatch_settings set enabled=true,endpoint='http://127.0.0.1:9' where id;
 request_id:=private.h10_cron_dispatch();
 select q.headers,convert_from(q.body,'UTF8')::jsonb into request_headers,envelope
  from net.http_request_queue q where q.id=request_id;
 perform pg_temp.h10_assert(request_headers->>'Authorization' is null and request_headers->>'authorization' is null,'REUSABLE_AUTH_QUEUED');
 perform pg_temp.h10_assert(position(repeat('a',64) in request_headers::text)=0,'SIGNING_KEY_QUEUED');
 perform pg_temp.h10_assert((select count(*)=4 from jsonb_object_keys(envelope)) and
  envelope->>'action'='sunat.dispatch' and envelope->>'schema_version'='1','DISPATCH_ENVELOPE_EXPOSED_DATA');
 nonce_id:=(envelope->>'nonce')::uuid; issued:=(envelope->>'issued_at')::bigint;
 perform pg_temp.h10_assert(request_headers->>'X-TaxSkill-Signature'=encode(extensions.hmac(
  'v1:'||nonce_id::text||':'||issued::text||':sunat.dispatch',repeat('a',64),'sha256'),'hex'),'DISPATCH_SIGNATURE_INVALID');
 perform pg_temp.h10_assert(not public.h10_dispatch_consume_nonce(nonce_id,issued+1),'NONCE_ISSUED_AT_NOT_BOUND');
 perform pg_temp.h10_assert(public.h10_dispatch_consume_nonce(nonce_id,issued),'VALID_NONCE_NOT_CONSUMED');
 perform pg_temp.h10_assert(not public.h10_dispatch_consume_nonce(nonce_id,issued),'NONCE_REPLAY_ACCEPTED');
 insert into private.sunat_dispatch_nonces(nonce,issued_at,expires_at) values(gen_random_uuid(),issued,now()-interval '1 second') returning nonce into nonce_id;
 perform pg_temp.h10_assert(not public.h10_dispatch_consume_nonce(nonce_id,issued),'EXPIRED_NONCE_ACCEPTED');
 update private.sunat_dispatch_settings set enabled=false where id;
 perform pg_temp.h10_assert(not exists(select 1 from cron.job where jobname='h10-sunat-dispatch'),'DISABLED_SCHEDULER_CREATED_JOB');
 perform pg_temp.h10_assert(private.h10_cron_dispatch() is null,'DISABLED_SCHEDULER_SENT_REQUEST');
 raise notice 'H10_DISPATCH_SQL: % checks passed; rollback follows',current_setting('taxskill.h10_checks');
end $$;
rollback;
