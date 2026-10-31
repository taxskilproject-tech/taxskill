create table private.sunat_dispatch_settings (
 id boolean primary key default true check(id),
 enabled boolean not null default false,
 endpoint text,
 secret_id uuid,
 last_request_id bigint,
 updated_at timestamptz not null default now()
);
alter table private.sunat_dispatch_settings enable row level security;
revoke all on private.sunat_dispatch_settings from public,anon,authenticated,service_role;
insert into private.sunat_dispatch_settings(id) values(true);

create function private.h10_cron_dispatch() returns bigint
language plpgsql security definer set search_path='' as $$
declare settings private.sunat_dispatch_settings; secret text; request_id bigint;
begin
 select * into settings from private.sunat_dispatch_settings where id;
 if not settings.enabled then return null; end if;
 select decrypted_secret into secret from vault.decrypted_secrets where id=settings.secret_id;
 if secret is null then raise exception 'H10_DISPATCH_SECRET_UNAVAILABLE'; end if;
 select net.http_post(url:=settings.endpoint,
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),
  body:='{}'::jsonb,timeout_milliseconds:=10000) into request_id;
 update private.sunat_dispatch_settings set last_request_id=request_id where id;
 return request_id;
end $$;
revoke all on function private.h10_cron_dispatch() from public,anon,authenticated,service_role;

create function public.h10_dispatch_configure(p_endpoint text,p_secret text,p_enabled boolean default false) returns boolean
language plpgsql security definer set search_path='' as $$
declare vault_id uuid; existing_job bigint;
begin
 if auth.role() is distinct from 'service_role' then perform private.fail('FORBIDDEN'); end if;
 if p_endpoint is distinct from 'https://taxskill.vercel.app/api/sunat/dispatch'
  or p_secret is null or p_secret !~ '^[a-f0-9]{64}$' then perform private.fail('VALIDATION_ERROR'); end if;
 perform pg_advisory_xact_lock(hashtextextended('h10-dispatch-configuration',0));
 select s.secret_id into vault_id from private.sunat_dispatch_settings s where id for update;
 if vault_id is null then
  select vault.create_secret(p_secret,'h10_dispatch_authorization','TaxSkill H10 worker dispatcher') into vault_id;
 else perform vault.update_secret(vault_id,p_secret); end if;
 update private.sunat_dispatch_settings set enabled=p_enabled,endpoint=p_endpoint,secret_id=vault_id,updated_at=now() where id;
 select jobid into existing_job from cron.job where jobname='h10-sunat-dispatch';
 if existing_job is not null then perform cron.unschedule(existing_job); end if;
 if p_enabled then perform cron.schedule('h10-sunat-dispatch','* * * * *','select private.h10_cron_dispatch();'); end if;
 return true;
end $$;
revoke all on function public.h10_dispatch_configure(text,text,boolean) from public,anon,authenticated;
grant execute on function public.h10_dispatch_configure(text,text,boolean) to service_role;

alter function public.h10_query(uuid,text,jsonb) rename to h10_query_without_dispatch;
alter function public.h10_query_without_dispatch(uuid,text,jsonb) set schema private;
revoke all on function private.h10_query_without_dispatch(uuid,text,jsonb) from public,anon,authenticated,service_role;
create function public.h10_query(p_organization_id uuid,p_resource text,p_input jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; error_code text;
begin
 result:=private.h10_query_without_dispatch(p_organization_id,p_resource,p_input);
 if p_resource='workspace' and result->>'ok'='true' then
  select r.last_error_code into error_code from private.sunat_dispatch_runtime r
   join public.sunat_jobs j on j.id=r.job_id where r.id and j.organization_id=p_organization_id
    and j.company_id=(p_input->>'company_id')::uuid;
  result:=jsonb_set(result,'{data}',(result->'data')||jsonb_build_object('dispatcher_error_code',error_code,
   'scheduler_enabled',(select enabled from private.sunat_dispatch_settings where id)));
 end if;
 return result;
end $$;
revoke all on function public.h10_query(uuid,text,jsonb) from public,anon;
grant execute on function public.h10_query(uuid,text,jsonb) to authenticated;
