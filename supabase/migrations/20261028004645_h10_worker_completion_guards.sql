create or replace function public.h10_worker_finish(p_job_id uuid,p_lease_token uuid,p_state text,p_error_code text,p_results jsonb,p_metrics jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare job public.sunat_jobs; item jsonb; yr int; mon int; result_state text;
begin
 p_error_code:=nullif(p_error_code,'');
 job:=private.h10_lease(p_job_id,p_lease_token);
 if job.kind in ('monthly','daily') and p_state='complete' and (
  jsonb_typeof(p_results) is distinct from 'array' or jsonb_array_length(p_results)<>2
  or not p_results @> '[{"mailbox":"notifications","state":"complete"},{"mailbox":"messages","state":"complete"}]'::jsonb
 ) then perform private.fail('VALIDATION_ERROR'); end if;
 if p_state not in ('complete','partial','failed') or p_error_code is not null and p_error_code !~ '^[A-Z_]{3,60}$'
  or p_state='complete' and p_error_code is not null or octet_length(coalesce(p_metrics,'{}')::text)>8192
  then perform private.fail('VALIDATION_ERROR'); end if;
 if job.kind='verify' then
  update public.sunat_connections set state=case when p_state='complete' then 'connected' else 'needs_attention' end,
   last_verified_at=case when p_state='complete' then now() else last_verified_at end,
   last_error_at=case when p_state<>'complete' then now() else null end,error_code=p_error_code,revision=revision+1,updated_at=now()
   where id=job.connection_id;
 elsif job.kind='monthly' then
  yr:=extract(year from job.from_date)::int; mon:=extract(month from job.from_date)::int;
  for item in select value from jsonb_array_elements(coalesce(p_results,'[]')) loop
   result_state:=item->>'state';
   if item->>'mailbox' not in ('messages','notifications') or result_state not in ('complete','partial','failed') then perform private.fail('VALIDATION_ERROR'); end if;
   insert into public.sunat_month_queries(organization_id,company_id,connection_id,year,month,mailbox,state,last_success_at,error_code,message_count,job_id)
   values(job.organization_id,job.company_id,job.connection_id,yr,mon,item->>'mailbox',result_state,
    case when result_state='complete' then now() end,p_error_code,(select count(*) from public.sunat_messages
     where connection_id=job.connection_id and mailbox=item->>'mailbox' and published_on between job.from_date and job.through_date),job.id)
   on conflict(connection_id,year,month,mailbox) do update set state=excluded.state,last_attempt_at=now(),
    last_success_at=coalesce(excluded.last_success_at,public.sunat_month_queries.last_success_at),
    error_code=excluded.error_code,message_count=excluded.message_count,job_id=excluded.job_id;
  end loop;
 end if;
 if job.kind in ('monthly','daily') then
  update public.sunat_connections set
   last_success_at=case when p_state='complete' then now() else last_success_at end,
   last_daily_success_at=case when p_state='complete' and (job.kind='daily'
    or job.from_date=date_trunc('month',now() at time zone 'America/Lima')::date)
    then now() else last_daily_success_at end,
   last_error_at=case when p_state<>'complete' then now() else null end,error_code=p_error_code,updated_at=now()
   where id=job.connection_id;
 end if;
 update public.sunat_jobs set state=p_state,error_code=p_error_code,finished_at=now(),lease_token=null,lease_expires_at=null,
  progress=progress||jsonb_build_object('metrics',p_metrics) where id=job.id;
 perform private.h10_audit(job.organization_id,null,job.company_id,job.id,'sunat.job.'||p_state,'sunat_jobs',job.id,
  jsonb_build_object('kind',job.kind,'state',p_state,'error_code',p_error_code));
 return true;
end $$;
