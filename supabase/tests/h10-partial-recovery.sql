-- Solo Docker H09/H10: ejecutar con el guard local y rollback obligatorio.
begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$
declare
 conn public.sunat_connections;
 job_id uuid:=gen_random_uuid();
 lease_id uuid:=gen_random_uuid();
 prefix text:='partial-sql-'||gen_random_uuid()::text||'-';
 records jsonb;
 checkpoint jsonb;
 previous_count bigint;
 previous_success timestamptz;
 current_success timestamptz;
 saved_checkpoint jsonb;
 rejected boolean:=false;
begin
 if current_setting('taxskill.local_docker_test',true) is distinct from 'h10-partial' then
  raise exception 'LOCAL_DOCKER_GUARD_REQUIRED';
 end if;
 select s.* into conn from public.sunat_connections s join public.companies c on c.id=s.company_id
 where c.ruc='20000000901' and s.state='connected' and s.deleted_at is null
 and not exists(select 1 from public.sunat_jobs j where j.connection_id=s.id and j.state in ('queued','running'));
 if conn.id is null then raise exception 'IDLE_H09_FIXTURE_REQUIRED'; end if;
 select count(*) into previous_count from public.sunat_messages where connection_id=conn.id
  and mailbox='messages' and published_on between '2026-10-01' and '2026-10-31';
 select last_success_at into previous_success from public.sunat_month_queries where connection_id=conn.id
  and year=2026 and month=10 and mailbox='messages';
 insert into public.sunat_jobs(id,organization_id,company_id,connection_id,kind,state,request_key,credential_version,
  from_date,through_date,worker_id,lease_token,lease_expires_at,started_at)
 values(job_id,conn.organization_id,conn.company_id,conn.id,'monthly','running',prefix,conn.credential_version,
  '2026-10-01','2026-10-31',gen_random_uuid(),lease_id,now()+interval '90 seconds',now());
 select jsonb_agg(jsonb_build_object('id',prefix||n,'subject','Registro sintético parcial','published_on','2026-10-15',
  'read',false,'has_attachments',false)) into records from generate_series(1,17) n;
 checkpoint:=jsonb_build_object('messages',jsonb_build_object('schema_version',1,'connection_key',conn.id::text,
  'mailbox','messages','from','2026-10-01','through','2026-10-31','next_page',1,'total',null,'order',null,
  'first_id',null,'last_date',null,'seen_ids','[]'::jsonb,'items','[]'::jsonb,'complete',false));
 perform public.h10_worker_batch(job_id,lease_id,'messages',records,checkpoint,'{"pages":0,"messages":17}');
 perform public.h10_worker_batch(job_id,lease_id,'messages',records,checkpoint,'{"pages":0,"messages":17}');
 if (select count(*) from public.sunat_messages where connection_id=conn.id and source_id like prefix||'%')<>17
  then raise exception 'PARTIAL_DEDUPLICATION_FAILED'; end if;
 select j.checkpoint into saved_checkpoint from public.sunat_jobs j where id=job_id;
 if saved_checkpoint#>>'{messages,next_page}'<>'1' or saved_checkpoint#>>'{messages,complete}'<>'false'
  then raise exception 'PARTIAL_CURSOR_ADVANCED'; end if;
 begin
  perform public.h10_worker_batch(job_id,lease_id,'messages',
   jsonb_build_array(jsonb_build_object('id',prefix||'outside','subject','Fixture fuera de periodo',
    'published_on','2025-01-01','read',false,'has_attachments',false)),checkpoint,'{}');
 exception when raise_exception then rejected:=true;
 end;
 if not rejected then raise exception 'OUTSIDE_PERIOD_ACCEPTED'; end if;
 perform public.h10_worker_finish(job_id,lease_id,'partial','PAGE_INCONSISTENT',
  '[{"mailbox":"notifications","state":"complete"},{"mailbox":"messages","state":"partial"}]','{}');
 select last_success_at into current_success from public.sunat_month_queries where connection_id=conn.id
  and year=2026 and month=10 and mailbox='messages';
 if current_success is distinct from previous_success then raise exception 'PARTIAL_SUCCESS_ADVANCED'; end if;
 if (select message_count from public.sunat_month_queries where connection_id=conn.id and year=2026 and month=10
  and mailbox='messages')<>previous_count+17 then raise exception 'PARTIAL_COUNT_LOST'; end if;
 if (select last_daily_success_at from public.sunat_connections where id=conn.id) is distinct from conn.last_daily_success_at
  then raise exception 'DAILY_WATERMARK_ADVANCED'; end if;
 raise notice 'H10_PARTIAL_SQL: 6 checks passed; all changes will roll back';
end $$;
rollback;
