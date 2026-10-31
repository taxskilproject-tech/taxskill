create or replace function public.h10_dispatch_finish(p_run_id uuid,p_error_code text default '',p_stopped boolean default false) returns boolean
language plpgsql security definer set search_path='' as $$
declare runtime private.sunat_dispatch_runtime; job public.sunat_jobs; failure_code text;
begin
 if auth.role() is distinct from 'service_role' then perform private.fail('FORBIDDEN'); end if;
 p_error_code:=nullif(p_error_code,'');
 if p_error_code is not null and p_error_code !~ '^[A-Z_]{3,60}$' then perform private.fail('VALIDATION_ERROR'); end if;
 select * into runtime from private.sunat_dispatch_runtime where id and lease_token=p_run_id for update;
 if not found then return false; end if;
 select * into job from public.sunat_jobs where id=runtime.job_id for update;
 if p_error_code is not null and job.state='running' then
  begin
   perform public.h10_worker_finish(job.id,job.lease_token,'failed',p_error_code,'[]','{}');
  exception when raise_exception then
   failure_code:=case when sqlerrm in ('FORBIDDEN','UNAUTHENTICATED') then 'ACCESS_REVOKED' else p_error_code end;
   if not public.h10_worker_abandon(job.id,job.lease_token,failure_code) then return false; end if;
   if job.kind='verify' then
    update public.sunat_connections set state='needs_attention',error_code=failure_code,last_error_at=now(),updated_at=now()
     where id=job.connection_id and credential_version=job.credential_version and state<>'disconnected';
   end if;
   perform private.h10_audit(job.organization_id,null,job.company_id,job.id,'sunat.job.failed','sunat_jobs',job.id,
    jsonb_build_object('kind',job.kind,'state','failed','error_code',failure_code));
   insert into public.sunat_notifications(organization_id,company_id,connection_id,recipient_id,event_key,title,body)
    select job.organization_id,job.company_id,job.connection_id,m.user_id,'job-error:'||job.id::text,
     'Revisar ejecución SUNAT','Una consulta no se completó. Revisa el estado del buzón y conserva el último resultado válido.'
    from public.organization_members m where m.organization_id=job.organization_id and m.is_admin
     and private.h10_allowed(job.organization_id,job.company_id,m.user_id)
    on conflict(connection_id,recipient_id,event_key) do nothing;
   p_error_code:=failure_code;
  end;
 elsif p_error_code='SANDBOX_EXECUTION_FAILED' and job.state in ('complete','partial','cancelled') then
  p_error_code:=null;
 elsif p_error_code='SANDBOX_EXECUTION_FAILED' and job.state='failed' then
  p_error_code:=coalesce(job.error_code,p_error_code);
 end if;
 update private.sunat_dispatch_runtime set last_error_code=p_error_code,last_finished_at=now(),
  lease_token=case when p_stopped then null else lease_token end,
  lease_expires_at=case when p_stopped then null else lease_expires_at end where id;
 return true;
end $$;
