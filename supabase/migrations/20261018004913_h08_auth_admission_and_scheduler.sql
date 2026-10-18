-- Direct service writes still evaluate CHECK constraints under the service role.
grant usage on schema private to service_role;
do $$ declare p record; begin
  for p in select f.oid::regprocedure signature from pg_proc f join pg_namespace n on n.oid=f.pronamespace
    where n.nspname='private' and f.provolatile='i' loop
    execute format('grant execute on function %s to service_role',p.signature);
  end loop;
end $$;

alter table public.app_sessions add column authentication_verified_at timestamptz,
  add column authentication_method text check(authentication_method in ('password')),
  add constraint h08_verified_auth_pair check((authentication_verified_at is null)=(authentication_method is null));

create function public.h08_access_token_hook(event jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_user uuid:=(event->>'user_id')::uuid; v_session uuid:=(event->'claims'->>'session_id')::uuid;
  v_method text:=event->>'authentication_method';
begin
  if v_method not in ('password','token_refresh') or v_method is null
    or v_user is distinct from (event->'claims'->>'sub')::uuid
    or not exists(select 1 from auth.sessions where id=v_session and user_id=v_user and (not_after is null or not_after>now())) then
    return '{"error":{"http_code":403,"message":"Contacta al administrador para gestionar tu acceso."}}'::jsonb;
  end if;
  if v_method='password' then
    update public.app_sessions a set authentication_verified_at=now(),authentication_method='password',last_seen_at=now()
      from public.organization_members m,public.profiles p where a.session_id=v_session and a.user_id=v_user and a.revoked_at is null
        and m.organization_id=a.organization_id and m.user_id=a.user_id and m.active and m.deleted_at is null
        and p.user_id=a.user_id and p.enabled and p.deleted_at is null and p.provisioning_status='ready';
  end if;
  if not exists(select 1 from public.app_sessions a join public.organization_members m on m.organization_id=a.organization_id and m.user_id=a.user_id
      join public.profiles p on p.user_id=a.user_id where a.session_id=v_session and a.user_id=v_user and a.revoked_at is null
        and a.authentication_verified_at is not null and a.authentication_method='password' and m.active and m.deleted_at is null
        and p.enabled and p.deleted_at is null and p.provisioning_status='ready') then
    return '{"error":{"http_code":403,"message":"Contacta al administrador para iniciar una sesión nueva."}}'::jsonb;
  end if;
  return jsonb_build_object('claims',event->'claims');
exception when invalid_text_representation then
  return '{"error":{"http_code":403,"message":"No se pudo verificar el acceso."}}'::jsonb;
end $$;
revoke all on function public.h08_access_token_hook(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.h08_access_token_hook(jsonb) to supabase_auth_admin;

create or replace function private.h08_session_valid(p_org uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.app_sessions a join auth.sessions s on s.id=a.session_id and s.user_id=a.user_id
    join public.profiles p on p.user_id=a.user_id join public.organization_members m on m.organization_id=a.organization_id and m.user_id=a.user_id
    where a.organization_id=p_org and a.user_id=auth.uid() and a.session_id=private.h08_session_id() and a.revoked_at is null
      and a.authentication_verified_at is not null and a.authentication_method='password'
      and (s.not_after is null or s.not_after>now()) and p.enabled and p.deleted_at is null and p.provisioning_status='ready'
      and m.active and m.deleted_at is null);
$$;

create function private.h08_jobs() returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('name',j.jobname,'active',j.active,'last_started_at',r.start_time,'last_status',r.status)),'[]')
    from cron.job j left join lateral(select start_time,status from cron.job_run_details where jobid=j.jobid order by start_time desc limit 1) r on true
    where j.jobname in ('h08-generation','h04-generation-day','h04-generation-continuation','h05-employment-continuation','h06-notifications-dispatch','h03-staging-cleanup');
$$;
create or replace function public.h08_health(p_organization_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if auth.role() is distinct from 'service_role' then
    perform private.admit_session(p_organization_id);
    perform private.assert_member(p_organization_id,auth.uid(),true,true);
  end if;
  if not exists(select 1 from public.organizations where id=p_organization_id) then perform private.fail('NOT_FOUND'); end if;
  return jsonb_build_object('ok',true,'data',jsonb_build_object('checked_at',now(),
    'stalled_uploads',(select count(*) from public.upload_intents where organization_id=p_organization_id and state in ('reserved','uploaded','validating') and (expires_at<now() or updated_at<now()-interval '30 minutes')),
    'rejected_uploads',(select count(*) from public.upload_intents where organization_id=p_organization_id and state='rejected' and updated_at>now()-interval '24 hours'),
    'generation_failures',(select count(*) from public.requirement_rules where organization_id=p_organization_id and deleted_at is null and generation_cursor->>'last_error' is not null),
    'invalid_responsibles',(select count(*) from public.obligations where organization_id=p_organization_id and disposition='active' and assignment_issue),
    'whatsapp_unknown',(select count(*) from public.whatsapp_digests where organization_id=p_organization_id and status='unknown'),
    'whatsapp_failed',(select count(*) from public.whatsapp_digests where organization_id=p_organization_id and status='failed'),
    'last_backup_at',(select max(completed_at) from private.h08_recovery_runs where kind='backup' and status='succeeded'),
    'backup_overdue',not exists(select 1 from private.h08_recovery_runs where kind='backup' and status='succeeded' and completed_at>now()-interval '24 hours'),
    'jobs',private.h08_jobs()));
exception when raise_exception then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',sqlerrm));
end $$;
grant execute on function public.h08_health(uuid) to service_role;

create function public.h08_generation_tick() returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_org public.organizations; v_claims text:=current_setting('request.jwt.claims',true); v_count integer:=0;
begin
  if auth.role() is distinct from 'service_role' and session_user not in ('postgres','supabase_admin') then perform private.fail('FORBIDDEN'); end if;
  if not pg_try_advisory_xact_lock(hashtextextended('taxskill:h08-generation',0)) then return '{"status":"busy"}'::jsonb; end if;
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  for v_org in select * from public.organizations where status='active' and deleted_at is null
    and (now() at time zone 'America/Lima')::time>=(settings->>'generation_local_time')::time loop
    perform public.h04_run_generation(v_org.id,100);
    perform public.h05_run_generation(v_org.id,100);
    v_count:=v_count+1;
  end loop;
  perform set_config('request.jwt.claims',coalesce(v_claims,''),true);
  return jsonb_build_object('status','completed','organizations',v_count);
end $$;
create function public.h08_schedule_generation(p_enabled boolean default false) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.role() is distinct from 'service_role' then perform private.fail('FORBIDDEN'); end if;
  perform public.h04_schedule_generation(false); perform public.h05_schedule_generation(false);
  perform cron.unschedule(jobid) from cron.job where jobname='h08-generation';
  if not p_enabled then return; end if;
  if not exists(select 1 from private.h08_recovery_runs where kind='backup' and status='succeeded' and completed_at>now()-interval '24 hours')
    or not exists(select 1 from private.h08_recovery_runs where kind='restore' and status='succeeded' and completed_at>now()-interval '30 days') then perform private.fail('DEPENDENCY_UNAVAILABLE'); end if;
  perform cron.schedule('h08-generation','* * * * *','select public.h08_generation_tick();');
end $$;
revoke all on function public.h08_generation_tick(),public.h08_schedule_generation(boolean) from public,anon,authenticated;
grant execute on function public.h08_generation_tick(),public.h08_schedule_generation(boolean) to service_role;
