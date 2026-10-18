-- Technical records live outside the exposed business schema. No credentials, payloads or object bytes.
create table private.h08_rate_limits (
  bucket text not null,key_hash text not null,window_start timestamptz not null,hits integer not null check(hits>0),
  expires_at timestamptz not null,primary key(bucket,key_hash,window_start)
);
create index h08_rate_limits_expiry on private.h08_rate_limits(expires_at);
create function public.h08_consume_rate_limit(p_bucket text,p_key_hash text,p_limit integer,p_seconds integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_window timestamptz; v_hits integer;
begin
  if auth.role() is distinct from 'service_role' then perform private.fail('FORBIDDEN'); end if;
  if p_bucket not in ('admin','receipts') or p_key_hash !~ '^[0-9a-f]{64}$'
    or p_limit not between 1 and 1000 or p_seconds not between 1 and 3600 then perform private.fail('VALIDATION_ERROR'); end if;
  v_window:=to_timestamp(floor(extract(epoch from now())/p_seconds)*p_seconds);
  delete from private.h08_rate_limits where expires_at<now();
  insert into private.h08_rate_limits(bucket,key_hash,window_start,hits,expires_at)
    values(p_bucket,p_key_hash,v_window,1,v_window+make_interval(secs=>p_seconds))
    on conflict(bucket,key_hash,window_start) do update set hits=least(h08_rate_limits.hits+1,p_limit+1)
    returning hits into v_hits;
  return v_hits<=p_limit;
end $$;

create table private.h08_recovery_runs (
  id uuid primary key,kind text not null check(kind in ('backup','restore')),
  status text not null check(status in ('running','succeeded','failed')),
  started_at timestamptz not null default now(),completed_at timestamptz,
  manifest_sha256 text check(manifest_sha256 ~ '^[0-9a-f]{64}$'),
  object_count bigint check(object_count>=0),verified_bytes bigint check(verified_bytes>=0),
  error_code text check(error_code in ('BACKUP_FAILED','RESTORE_FAILED','INTEGRITY_FAILED')),
  check(status='running' and completed_at is null or status<>'running' and completed_at is not null)
);
create function public.h08_record_recovery(p_id uuid,p_kind text,p_status text,p_manifest_sha256 text default null,
  p_object_count bigint default null,p_verified_bytes bigint default null,p_error_code text default null) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.role() is distinct from 'service_role' then perform private.fail('FORBIDDEN'); end if;
  if p_status='succeeded' and (p_manifest_sha256 is null or p_object_count is null or p_verified_bytes is null)
    then perform private.fail('VALIDATION_ERROR'); end if;
  insert into private.h08_recovery_runs(id,kind,status,completed_at,manifest_sha256,object_count,verified_bytes,error_code)
    values(p_id,p_kind,p_status,case when p_status<>'running' then now() end,p_manifest_sha256,p_object_count,p_verified_bytes,p_error_code)
    on conflict(id) do update set status=excluded.status,completed_at=excluded.completed_at,
      manifest_sha256=excluded.manifest_sha256,object_count=excluded.object_count,verified_bytes=excluded.verified_bytes,error_code=excluded.error_code
    where h08_recovery_runs.kind=excluded.kind and h08_recovery_runs.status='running';
end $$;

create function public.h08_health(p_organization_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  perform private.admit_session(p_organization_id);
  perform private.assert_member(p_organization_id,auth.uid(),true,true);
  return jsonb_build_object('ok',true,'data',jsonb_build_object(
    'checked_at',now(),
    'stalled_uploads',(select count(*) from public.upload_intents where organization_id=p_organization_id and state in ('reserved','uploaded','validating') and (expires_at<now() or updated_at<now()-interval '30 minutes')),
    'rejected_uploads',(select count(*) from public.upload_intents where organization_id=p_organization_id and state='rejected' and updated_at>now()-interval '24 hours'),
    'generation_failures',(select count(*) from public.requirement_rules where organization_id=p_organization_id and deleted_at is null and generation_cursor->>'last_error' is not null),
    'invalid_responsibles',(select count(*) from public.obligations where organization_id=p_organization_id and disposition='active' and assignment_issue),
    'whatsapp_unknown',(select count(*) from public.whatsapp_digests where organization_id=p_organization_id and status='unknown'),
    'whatsapp_failed',(select count(*) from public.whatsapp_digests where organization_id=p_organization_id and status='failed'),
    'last_backup_at',(select max(completed_at) from private.h08_recovery_runs where kind='backup' and status='succeeded'),
    'backup_overdue',not exists(select 1 from private.h08_recovery_runs where kind='backup' and status='succeeded' and completed_at>now()-interval '24 hours'),
    'jobs',(select coalesce(jsonb_agg(jsonb_build_object('name',j.jobname,'active',j.active,'last_started_at',r.start_time,'last_status',r.status)),'[]')
      from cron.job j left join lateral(select start_time,status from cron.job_run_details where jobid=j.jobid order by start_time desc limit 1) r on true
      where j.jobname in ('h05-generation-day','h05-generation-continuation','h06-notifications-dispatch','h03-staging-cleanup'))));
exception when raise_exception then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',sqlerrm));
end $$;

-- Do not activate jobs in a migration. Operators opt in after deployment and restore checks.
alter table private.h08_rate_limits enable row level security;
alter table private.h08_recovery_runs enable row level security;
revoke all on private.h08_rate_limits,private.h08_recovery_runs from public,anon,authenticated;
revoke all on function public.h08_consume_rate_limit(text,text,integer,integer),
  public.h08_record_recovery(uuid,text,text,text,bigint,bigint,text),public.h08_health(uuid) from public,anon,authenticated;
grant execute on function public.h08_consume_rate_limit(text,text,integer,integer),
  public.h08_record_recovery(uuid,text,text,text,bigint,bigint,text) to service_role;
grant execute on function public.h08_health(uuid) to authenticated;
