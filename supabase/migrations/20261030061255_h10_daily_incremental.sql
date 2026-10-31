alter table public.sunat_connections add column daily_baseline_at timestamptz;

create function private.h10_reset_daily_baseline() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.credential_version is distinct from old.credential_version then new.daily_baseline_at:=null; end if;
 return new;
end $$;
create trigger h10_reset_daily_baseline before update of credential_version on public.sunat_connections
 for each row execute function private.h10_reset_daily_baseline();
revoke all on function private.h10_reset_daily_baseline() from public,anon,authenticated,service_role;

-- Continuar únicamente un barrido limitado válido de la misma versión de credenciales.
create function private.h10_prepare_daily_scan(conn public.sunat_connections,job_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare previous public.sunat_jobs;
begin
 select * into previous from public.sunat_jobs where connection_id=conn.id and id<>job_id and kind='daily'
  and credential_version=conn.credential_version order by created_at desc,id desc limit 1;
 if previous.state='partial' and previous.error_code='BUDGET_EXHAUSTED' then
  update public.sunat_jobs set from_date=previous.from_date,
   checkpoint=previous.checkpoint||'{"resume":true}'::jsonb where id=job_id;
 end if;
 update public.sunat_connections set daily_baseline_at=coalesce(daily_baseline_at,now()) where id=conn.id;
end $$;
revoke all on function private.h10_prepare_daily_scan(public.sunat_connections,uuid) from public,anon,authenticated,service_role;

create or replace function public.h10_worker_tick(p_worker_id uuid,p_mode text,p_run_daily boolean default false,p_now timestamptz default now()) returns jsonb
language plpgsql security definer set search_path='' as $$
declare conn public.sunat_connections; job public.sunat_jobs; day date:=(p_now at time zone 'America/Lima')::date; job_id uuid;
begin
 if auth.role() is distinct from 'service_role' or p_mode not in ('sunat','simulator') then perform private.fail('FORBIDDEN'); end if;
 if p_now is null then perform private.fail('VALIDATION_ERROR'); end if;
 perform pg_advisory_xact_lock(hashtextextended('h10-global-worker',0));
 insert into private.sunat_worker_runtime(id,last_seen_at,mode) values('primary',now(),p_mode)
 on conflict(id) do update set last_seen_at=now(),mode=excluded.mode;
 -- Una cola secuencial de varias empresas puede superar diez minutos sin que el trabajo haya fallado.
 update public.sunat_connections c set state='needs_attention',last_error_at=now(),error_code='WORKER_TIMEOUT'
  where exists(select 1 from public.sunat_jobs j where j.connection_id=c.id and j.kind='verify'
   and (j.state='running' and j.lease_expires_at<now() or j.state='queued' and j.created_at<now()-interval '24 hours'));
 update public.sunat_jobs set state='failed',error_code='WORKER_TIMEOUT',finished_at=now(),lease_token=null,lease_expires_at=null
  where state='running' and lease_expires_at<now() or state='queued' and created_at<now()-interval '24 hours';
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
   perform private.h10_prepare_daily_scan(conn,job_id);
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

create or replace function public.h10_worker_batch(p_job_id uuid,p_lease_token uuid,p_mailbox text,p_records jsonb,p_checkpoint jsonb,p_progress jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare job public.sunat_jobs; conn public.sunat_connections; item jsonb; msg_id uuid; fresh boolean;
begin
 job:=private.h10_lease(p_job_id,p_lease_token);
 select * into conn from public.sunat_connections where id=job.connection_id;
 if job.kind not in ('monthly','daily') or p_mailbox not in ('notifications','messages')
  or jsonb_typeof(p_records) is distinct from 'array' or jsonb_array_length(p_records)>25
  or jsonb_typeof(p_checkpoint) is distinct from 'object' or octet_length(p_checkpoint::text)>1048576
  then perform private.fail('VALIDATION_ERROR'); end if;
 for item in select value from jsonb_array_elements(p_records) loop
  if (item->>'published_on')::date not between job.from_date and job.through_date
   or jsonb_typeof(item->'read') is distinct from 'boolean' or jsonb_typeof(item->'has_attachments') is distinct from 'boolean'
   then perform private.fail('VALIDATION_ERROR'); end if;
  select id into msg_id from public.sunat_messages where connection_id=conn.id and mailbox=p_mailbox and source_id=item->>'id';
  fresh:=msg_id is null;
  insert into public.sunat_messages(organization_id,company_id,connection_id,mailbox,source_id,published_on,subject,source_read,has_attachments)
  values(job.organization_id,job.company_id,conn.id,p_mailbox,item->>'id',(item->>'published_on')::date,item->>'subject',
   (item->>'read')::boolean,(item->>'has_attachments')::boolean)
  on conflict(connection_id,mailbox,source_id) do update set published_on=excluded.published_on,subject=excluded.subject,
   source_read=excluded.source_read,has_attachments=excluded.has_attachments,last_seen_at=now() returning id into msg_id;
  if fresh and job.kind='daily' and coalesce(conn.daily_baseline_at,conn.last_daily_success_at)<job.created_at then
   insert into public.sunat_notifications(organization_id,company_id,connection_id,recipient_id,message_id,published_on,event_key,title,body)
   select job.organization_id,job.company_id,conn.id,m.user_id,msg_id,(item->>'published_on')::date,'message:'||msg_id::text,
    'Novedades en Buzón SUNAT','Se recuperó un nuevo registro del buzón de tu empresa.'
   from public.organization_members m where m.organization_id=job.organization_id and private.h10_allowed(job.organization_id,job.company_id,m.user_id)
   on conflict(connection_id,recipient_id,event_key) do nothing;
  end if;
 end loop;
 update public.sunat_jobs set checkpoint=p_checkpoint,progress=jsonb_build_object('pages',coalesce((p_progress->>'pages')::int,0),
  'messages',coalesce((p_progress->>'messages')::int,0),'mailbox',p_mailbox),lease_expires_at=now()+interval '90 seconds' where id=job.id;
 return true;
end $$;
