create function public.h10_worker_batch(p_job_id uuid,p_lease_token uuid,p_mailbox text,p_records jsonb,p_checkpoint jsonb,p_progress jsonb)
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
  if fresh and job.kind='daily' and conn.last_daily_success_at is not null then
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

create function public.h10_worker_details(p_job_id uuid,p_lease_token uuid,p_text text,p_attachments jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
declare job public.sunat_jobs; item jsonb; file_id uuid; ruc text;
begin
 job:=private.h10_lease(p_job_id,p_lease_token);
 if job.kind<>'message' or length(p_text)>200000 or jsonb_typeof(p_attachments) is distinct from 'array'
  or jsonb_array_length(p_attachments)>50 then perform private.fail('VALIDATION_ERROR'); end if;
 select trim(c.ruc) into ruc from public.companies c where c.id=job.company_id;
 update public.sunat_messages set content_text=p_text,details_loaded_at=now(),source_read=true where id=job.message_id and company_id=job.company_id;
 for item in select value from jsonb_array_elements(p_attachments) loop
  if (item->>'locator') !~ '^/ol-ti-itvisornoti/visor/bajarArchivo/' or (item->>'locator') ~ '[?#]'
   or right(item->>'locator',12)<>'/'||ruc or length(item->>'locator')>1000
   or strpos(item->>'filename','/')>0 or strpos(item->>'filename',chr(92))>0 or (item->>'filename') ~ '[[:cntrl:]]'
   then perform private.fail('VALIDATION_ERROR'); end if;
  insert into public.sunat_attachments(organization_id,company_id,message_id,source_key,filename)
   values(job.organization_id,job.company_id,job.message_id,item->>'source_key',item->>'filename')
   on conflict(message_id,source_key) do update set filename=excluded.filename returning id into file_id;
  insert into private.sunat_attachment_sources(attachment_id,locator) values(file_id,item->>'locator')
   on conflict(attachment_id) do update set locator=excluded.locator;
 end loop;
 perform private.h10_audit(job.organization_id,null,job.company_id,job.id,'sunat.message.loaded','sunat_messages',job.message_id,
  jsonb_build_object('attachments',jsonb_array_length(p_attachments)));
 return true;
end $$;

create function public.h10_worker_attachment(p_job_id uuid,p_lease_token uuid,p_input jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
declare job public.sunat_jobs; expected text;
begin
 job:=private.h10_lease(p_job_id,p_lease_token);
 expected:=job.organization_id::text||'/'||job.connection_id::text||'/'||job.attachment_id::text||'/'||(p_input->>'sha256');
 if job.kind<>'attachment' or p_input->>'object_name' is distinct from expected
  or (p_input->>'sha256') !~ '^[0-9a-f]{64}$' or (p_input->>'byte_size')::bigint not between 1 and 20000000
  or not exists(select 1 from storage.objects where bucket_id='sunat-mailbox' and name=expected)
  then perform private.fail('VALIDATION_ERROR'); end if;
 update public.sunat_attachments set state='cached',object_name=expected,sha256=p_input->>'sha256',
  byte_size=(p_input->>'byte_size')::bigint,mime_type=p_input->>'mime_type',cached_at=now(),error_code=null
  where id=job.attachment_id and company_id=job.company_id;
 return true;
end $$;

create function public.h10_worker_finish(p_job_id uuid,p_lease_token uuid,p_state text,p_error_code text,p_results jsonb,p_metrics jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare job public.sunat_jobs; item jsonb; yr int; mon int; result_state text;
begin
 job:=private.h10_lease(p_job_id,p_lease_token);
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

create function public.h10_worker_abandon(p_job_id uuid,p_lease_token uuid,p_error_code text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then perform private.fail('FORBIDDEN'); end if;
 if p_error_code !~ '^[A-Z_]{3,60}$' then perform private.fail('VALIDATION_ERROR'); end if;
 update public.sunat_jobs set state='failed',error_code=p_error_code,finished_at=now(),lease_token=null,lease_expires_at=null
  where id=p_job_id and state='running' and lease_token=p_lease_token;
 return found;
end $$;
revoke all on function public.h10_worker_batch(uuid,uuid,text,jsonb,jsonb,jsonb),public.h10_worker_details(uuid,uuid,text,jsonb),
 public.h10_worker_attachment(uuid,uuid,jsonb),public.h10_worker_finish(uuid,uuid,text,text,jsonb,jsonb),public.h10_worker_abandon(uuid,uuid,text)
 from public,anon,authenticated;
grant execute on function public.h10_worker_batch(uuid,uuid,text,jsonb,jsonb,jsonb),public.h10_worker_details(uuid,uuid,text,jsonb),
 public.h10_worker_attachment(uuid,uuid,jsonb),public.h10_worker_finish(uuid,uuid,text,text,jsonb,jsonb),public.h10_worker_abandon(uuid,uuid,text)
 to service_role;
