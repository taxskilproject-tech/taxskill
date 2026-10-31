-- Un lease global impide iniciar otro navegador hasta confirmar el cierre o expirar el límite de la VM.
create table private.sunat_dispatch_runtime (
 id boolean primary key default true check(id),
 lease_token uuid,
 lease_expires_at timestamptz,
 job_id uuid references public.sunat_jobs(id) on delete restrict,
 worker_id uuid,
 last_started_at timestamptz,
 last_finished_at timestamptz,
 last_error_code text check(last_error_code is null or last_error_code ~ '^[A-Z_]{3,60}$'),
 check((lease_token is null)=(lease_expires_at is null))
);
alter table private.sunat_dispatch_runtime enable row level security;
revoke all on private.sunat_dispatch_runtime from public,anon,authenticated,service_role;

create function public.h10_dispatch_authorize(p_organization_id uuid,p_job_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare job public.sunat_jobs;
begin
 perform private.admit_session(p_organization_id);
 select * into job from public.sunat_jobs where id=p_job_id and organization_id=p_organization_id;
 if job.id is null or not private.h10_read(p_organization_id,job.company_id)
  then perform private.fail('FORBIDDEN'); end if;
 return true;
end $$;
revoke all on function public.h10_dispatch_authorize(uuid,uuid) from public,anon;
grant execute on function public.h10_dispatch_authorize(uuid,uuid) to authenticated;

create function public.h10_dispatch_claim(p_run_daily boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare runtime private.sunat_dispatch_runtime; claim jsonb; token uuid:=gen_random_uuid(); worker uuid:=gen_random_uuid();
begin
 if auth.role() is distinct from 'service_role' then perform private.fail('FORBIDDEN'); end if;
 perform pg_advisory_xact_lock(hashtextextended('h10-sandbox-dispatcher',0));
 insert into private.sunat_dispatch_runtime(id) values(true) on conflict do nothing;
 select * into runtime from private.sunat_dispatch_runtime where id for update;
 if runtime.lease_expires_at>now() then return null; end if;
 claim:=public.h10_worker_tick(worker,'sunat',p_run_daily);
 if claim is null then return null; end if;
 update private.sunat_dispatch_runtime set lease_token=token,lease_expires_at=now()+interval '330 seconds',
  job_id=(claim->'job'->>'id')::uuid,worker_id=worker,last_started_at=now(),last_error_code=null where id;
 -- La creación de la VM no debe consumir el lease antes del primer heartbeat del worker.
 update public.sunat_jobs set lease_expires_at=now()+interval '330 seconds' where id=(claim->'job'->>'id')::uuid;
 return jsonb_build_object('run_id',token,'claim',claim);
end $$;

create function public.h10_dispatch_finish(p_run_id uuid,p_error_code text default '',p_stopped boolean default false) returns boolean
language plpgsql security definer set search_path='' as $$
declare runtime private.sunat_dispatch_runtime; job public.sunat_jobs;
begin
 if auth.role() is distinct from 'service_role' then perform private.fail('FORBIDDEN'); end if;
 p_error_code:=nullif(p_error_code,'');
 if p_error_code is not null and p_error_code !~ '^[A-Z_]{3,60}$' then perform private.fail('VALIDATION_ERROR'); end if;
 select * into runtime from private.sunat_dispatch_runtime where id and lease_token=p_run_id for update;
 if not found then return false; end if;
 select * into job from public.sunat_jobs where id=runtime.job_id for update;
 if p_error_code is not null and job.state='running' and job.lease_expires_at>now() then
  perform public.h10_worker_finish(job.id,job.lease_token,'failed',p_error_code,'[]','{}');
 end if;
 update private.sunat_dispatch_runtime set last_error_code=p_error_code,last_finished_at=now(),
  lease_token=case when p_stopped then null else lease_token end,
  lease_expires_at=case when p_stopped then null else lease_expires_at end where id;
 return true;
end $$;
revoke all on function public.h10_dispatch_claim(boolean),public.h10_dispatch_finish(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.h10_dispatch_claim(boolean),public.h10_dispatch_finish(uuid,text,boolean) to service_role;
