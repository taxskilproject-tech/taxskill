create function private.h10_live_job(job public.sunat_jobs) returns void
language plpgsql security definer set search_path='' as $$
declare conn public.sunat_connections;
begin
 select * into conn from public.sunat_connections where id=job.connection_id;
 if conn.id is null or conn.deleted_at is not null or conn.state='disconnected'
  or conn.credential_version<>job.credential_version or not exists(select 1 from public.companies c
   where c.organization_id=job.organization_id and c.id=job.company_id and c.status='active' and c.deleted_at is null)
 then perform private.fail('FORBIDDEN'); end if;
 if job.requester_id is not null then
  perform private.h10_service_actor(job.organization_id,job.requester_id,job.requester_session,false);
  if not private.h10_allowed(job.organization_id,job.company_id,job.requester_id) then perform private.fail('FORBIDDEN'); end if;
 else
  perform private.assert_member(job.organization_id,conn.consented_by,true);
 end if;
end $$;
create function private.h10_lease(job_id uuid,token uuid) returns public.sunat_jobs
language plpgsql security definer set search_path='' as $$
declare job public.sunat_jobs;
begin
 if auth.role() is distinct from 'service_role' then perform private.fail('FORBIDDEN'); end if;
 select * into job from public.sunat_jobs where id=job_id for update;
 if job.id is null or job.state<>'running' or job.lease_token is distinct from token or job.lease_expires_at<=now()
  then perform private.fail('CONFLICT'); end if;
 perform private.h10_live_job(job);
 return job;
end $$;

create function public.h10_worker_tick(p_worker_id uuid,p_mode text,p_run_daily boolean default false,p_now timestamptz default now()) returns jsonb
language plpgsql security definer set search_path='' as $$
declare conn public.sunat_connections; job public.sunat_jobs; day date:=(p_now at time zone 'America/Lima')::date; job_id uuid;
begin
 if auth.role() is distinct from 'service_role' or p_mode not in ('sunat','simulator') then perform private.fail('FORBIDDEN'); end if;
 perform pg_advisory_xact_lock(hashtextextended('h10-global-worker',0));
 insert into private.sunat_worker_runtime(id,last_seen_at,mode) values('primary',now(),p_mode)
 on conflict(id) do update set last_seen_at=now(),mode=excluded.mode;
 update public.sunat_connections c set state='needs_attention',last_error_at=now(),error_code='WORKER_TIMEOUT'
  where exists(select 1 from public.sunat_jobs j where j.connection_id=c.id and j.kind='verify'
   and (j.state='running' and j.lease_expires_at<now() or j.state='queued' and j.created_at<now()-interval '10 minutes'));
 update public.sunat_jobs set state='failed',error_code='WORKER_TIMEOUT',finished_at=now(),lease_token=null,lease_expires_at=null
  where state='running' and lease_expires_at<now() or state='queued' and created_at<now()-interval '10 minutes';
 if exists(select 1 from public.sunat_jobs where state='running' and lease_expires_at>now()) then return null; end if;
 if p_run_daily then
  for conn in select s.* from public.sunat_connections s join public.companies c on c.organization_id=s.organization_id and c.id=s.company_id
   join public.organizations o on o.id=s.organization_id where s.state='connected' and s.daily_enabled and s.deleted_at is null
    and c.status='active' and c.deleted_at is null and o.status='active' and o.deleted_at is null
    and (p_now at time zone 'America/Lima')::time>=s.daily_time
    and (s.last_daily_success_at is null or (s.last_daily_success_at at time zone 'America/Lima')::date<day)
    and not exists(select 1 from public.sunat_jobs j where j.connection_id=s.id and (j.state in ('queued','running') or j.request_key='daily:'||day::text))
   order by s.id limit 100 loop
   job_id:=private.h10_enqueue(conn,'daily','daily:'||day::text,null,null,
    coalesce((conn.last_daily_success_at at time zone 'America/Lima')::date,date_trunc('month',day)::date),day);
  end loop;
 end if;
 select j.* into job from public.sunat_jobs j where j.state='queued' order by j.created_at,j.id for update skip locked limit 1;
 if job.id is null then return null; end if;
 begin perform private.h10_live_job(job);
 exception when raise_exception then
  update public.sunat_jobs set state='failed',error_code='ACCESS_REVOKED',finished_at=now() where id=job.id; return null;
 end;
 update public.sunat_jobs set state='running',worker_id=p_worker_id,lease_token=gen_random_uuid(),lease_expires_at=now()+interval '90 seconds',
  attempts=attempts+1,started_at=coalesce(started_at,now()) where id=job.id returning * into job;
 return jsonb_build_object('job',to_jsonb(job),'connection',(select to_jsonb(c) from public.sunat_connections c where c.id=job.connection_id),
  'company',(select jsonb_build_object('id',c.id,'ruc',c.ruc,'legal_name',c.legal_name) from public.companies c where c.id=job.company_id),
  'encrypted',(select encrypted from private.sunat_credentials where connection_id=job.connection_id and credential_version=job.credential_version),
  'message',(select to_jsonb(m) from public.sunat_messages m where m.id=job.message_id),
  'attachment',(select to_jsonb(a)||jsonb_build_object('locator',s.locator) from public.sunat_attachments a
   join private.sunat_attachment_sources s on s.attachment_id=a.id where a.id=job.attachment_id));
end $$;

create function public.h10_worker_heartbeat(p_job_id uuid,p_lease_token uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare job public.sunat_jobs;
begin
 job:=private.h10_lease(p_job_id,p_lease_token);
 update public.sunat_jobs set lease_expires_at=now()+interval '90 seconds' where id=job.id;
 update private.sunat_worker_runtime set last_seen_at=now() where id='primary';
 return true;
end $$;
revoke all on function public.h10_worker_tick(uuid,text,boolean,timestamptz),public.h10_worker_heartbeat(uuid,uuid) from public,anon,authenticated;
grant execute on function public.h10_worker_tick(uuid,text,boolean,timestamptz),public.h10_worker_heartbeat(uuid,uuid) to service_role;
revoke all on function private.h10_live_job(public.sunat_jobs),private.h10_lease(uuid,uuid) from public,anon,authenticated;
