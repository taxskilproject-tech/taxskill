create function private.h10_service_actor(org uuid,actor uuid,sid uuid,admin_required boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then perform private.fail('FORBIDDEN'); end if;
 perform private.assert_member(org,actor,admin_required);
 if not exists(select 1 from public.app_sessions a join auth.sessions s on s.id=a.session_id and s.user_id=a.user_id
  where a.organization_id=org and a.user_id=actor and a.session_id=sid and a.revoked_at is null
   and a.authentication_verified_at is not null and a.authentication_method='password' and (s.not_after is null or s.not_after>now()))
 then perform private.fail('UNAUTHENTICATED'); end if;
end $$;

create function private.h10_enqueue(conn public.sunat_connections,kind_name text,req_key text,actor uuid,sid uuid,
 first_day date default null,last_day date default null,message uuid default null,attachment uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare existing public.sunat_jobs; result uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('h10:'||conn.id::text,0));
 select * into existing from public.sunat_jobs where connection_id=conn.id and request_key=req_key;
 if existing.id is not null then return existing.id; end if;
 select * into existing from public.sunat_jobs where connection_id=conn.id and state in ('queued','running');
 if existing.id is not null then
  if existing.kind=kind_name and existing.from_date is not distinct from first_day and existing.through_date is not distinct from last_day
    and existing.message_id is not distinct from message and existing.attachment_id is not distinct from attachment then return existing.id; end if;
  perform private.fail('CONFLICT');
 end if;
 insert into public.sunat_jobs(organization_id,company_id,connection_id,kind,request_key,credential_version,requester_id,requester_session,
  from_date,through_date,message_id,attachment_id,daily_date)
 values(conn.organization_id,conn.company_id,conn.id,kind_name,req_key,conn.credential_version,actor,sid,
  first_day,last_day,message,attachment,case when kind_name='daily' then last_day end) returning id into result;
 return result;
end $$;

create function private.h10_apply_command(org uuid,actor uuid,req uuid,op text,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare company uuid:=(input->>'company_id')::uuid; member public.organization_members; conn public.sunat_connections;
 target public.organization_members; access public.sunat_access_grants; msg public.sunat_messages; file public.sunat_attachments;
 alert public.sunat_notifications; job_id uuid; first_day date; last_day date; result_id uuid; result_rev int:=0; enabled boolean;
begin
 member:=private.assert_member(org,actor);
 if member.member_type<>'internal' then perform private.fail('FORBIDDEN'); end if;
 if op='MarkAlertRead' then
  select * into alert from public.sunat_notifications where organization_id=org and recipient_id=actor and id=(input->>'id')::uuid;
  if alert.id is null or not private.h10_allowed(org,alert.company_id,actor) then perform private.fail('NOT_FOUND'); end if;
  update public.sunat_notifications set read_at=coalesce(read_at,now()) where id=alert.id;
  return jsonb_build_object('resource_id',alert.id,'job_id',null,'revision',0,'state','complete');
 end if;
 if not private.h10_allowed(org,company,actor) then perform private.fail('FORBIDDEN'); end if;
 if op='SetAccess' then
  if not member.is_admin or jsonb_typeof(input->'allowed') is distinct from 'boolean' then perform private.fail('FORBIDDEN'); end if;
  select * into target from public.organization_members where organization_id=org and id=(input->>'member_id')::uuid;
  if target.id is null or target.is_admin or target.member_type<>'internal' then perform private.fail('VALIDATION_ERROR'); end if;
  enabled:=(input->>'allowed')::boolean;
  if enabled and not private.h10_eligible(org,company,target.user_id) then perform private.fail('FORBIDDEN'); end if;
  select * into access from public.sunat_access_grants where organization_id=org and company_id=company and member_id=target.id for update;
  if coalesce(access.revision,0) is distinct from (input->>'expected_revision')::int then perform private.fail('CONFLICT'); end if;
  insert into public.sunat_access_grants(organization_id,company_id,member_id,active,created_by,updated_by)
   values(org,company,target.id,enabled,actor,actor)
   on conflict(organization_id,company_id,member_id) do update set active=excluded.active,deleted_at=null,deleted_by=null,deletion_reason=null,
    revision=public.sunat_access_grants.revision+1,updated_at=now(),updated_by=actor returning id,revision into result_id,result_rev;
  perform private.h10_audit(org,actor,company,req,'sunat.access.updated','sunat_access_grants',result_id,
   jsonb_build_object('member_id',target.id,'allowed',enabled));
  return jsonb_build_object('resource_id',result_id,'job_id',null,'revision',result_rev,'state','complete');
 end if;
 select * into conn from public.sunat_connections where organization_id=org and company_id=company and deleted_at is null for update;
 if conn.id is null then perform private.fail('NOT_FOUND'); end if;
 if op in ('Disconnect','UpdateSchedule','CancelJob') then
  if not member.is_admin then perform private.fail('FORBIDDEN'); end if;
  if conn.revision is distinct from (input->>'expected_revision')::int then perform private.fail('CONFLICT'); end if;
  if op='Disconnect' then
   update public.sunat_jobs set state='cancelled',finished_at=now(),lease_token=null,lease_expires_at=null
    where connection_id=conn.id and state in ('queued','running');
   delete from private.sunat_credentials where connection_id=conn.id;
   update public.sunat_connections set state='disconnected',daily_enabled=false,credential_version=credential_version+1,
    error_code=null,updated_at=now(),updated_by=actor,revision=revision+1 where id=conn.id returning revision into result_rev;
  elsif op='UpdateSchedule' then
   if jsonb_typeof(input->'daily_enabled') is distinct from 'boolean' or coalesce(input->>'daily_time','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    or conn.state='disconnected' and (input->>'daily_enabled')::boolean then perform private.fail('VALIDATION_ERROR'); end if;
   update public.sunat_connections set daily_enabled=(input->>'daily_enabled')::boolean,daily_time=(input->>'daily_time')::time,
    revision=revision+1,updated_at=now(),updated_by=actor where id=conn.id returning revision into result_rev;
  else
   update public.sunat_jobs set state='cancelled',finished_at=now(),lease_token=null,lease_expires_at=null
    where connection_id=conn.id and id=(input->>'job_id')::uuid and state in ('queued','running');
   result_rev:=conn.revision;
  end if;
  perform private.h10_audit(org,actor,company,req,'sunat.'||lower(op),'sunat_connections',conn.id,'{}');
  return jsonb_build_object('resource_id',conn.id,'job_id',null,'revision',result_rev,'state','complete');
 end if;
 if conn.state<>'connected' then perform private.fail('CONFLICT'); end if;
 if op='RequestSync' then
  first_day:=make_date((input->>'year')::int,(input->>'month')::int,1);
  if first_day is null or first_day>(now() at time zone 'America/Lima')::date or extract(year from first_day) not between 1990 and 2200
   then perform private.fail('VALIDATION_ERROR'); end if;
  last_day:=(first_day+interval '1 month - 1 day')::date;
  job_id:=private.h10_enqueue(conn,'monthly',req::text,actor,private.h08_session_id(),first_day,last_day);
 elsif op='RequestMessage' then
  select * into msg from public.sunat_messages where organization_id=org and company_id=company and id=(input->>'message_id')::uuid;
  if msg.id is null then perform private.fail('NOT_FOUND'); end if;
  if msg.details_loaded_at is null then
   job_id:=private.h10_enqueue(conn,'message',req::text,actor,private.h08_session_id(),null,null,msg.id);
  end if;
 elsif op='RequestAttachment' then
  select * into file from public.sunat_attachments where organization_id=org and company_id=company and id=(input->>'attachment_id')::uuid;
  if file.id is null then perform private.fail('NOT_FOUND'); end if;
  if file.state<>'cached' then
   job_id:=private.h10_enqueue(conn,'attachment',req::text,actor,private.h08_session_id(),null,null,file.message_id,file.id);
  end if;
 else perform private.fail('VALIDATION_ERROR'); end if;
 return jsonb_build_object('resource_id',conn.id,'job_id',job_id,'revision',conn.revision,'state',case when job_id is null then 'complete' else 'queued' end);
end $$;

create function public.h10_command(p_organization_id uuid,p_request_id uuid,p_operation text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare existing public.operation_requests; result jsonb; fingerprint text;
begin
 perform private.admit_session(p_organization_id); perform private.assert_member(p_organization_id,auth.uid());
 if p_operation<>'MarkAlertRead' and not private.h10_allowed(p_organization_id,(p_input->>'company_id')::uuid,auth.uid())
  then perform private.fail('FORBIDDEN'); end if;
 if p_input is null or jsonb_typeof(p_input)<>'object' or p_request_id is null or octet_length(p_input::text)>8192
  then perform private.fail('VALIDATION_ERROR'); end if;
 fingerprint:=encode(extensions.digest(convert_to(p_input::text,'utf8'),'sha256'),'hex');
 insert into public.operation_requests(organization_id,request_id,actor_user_id,actor_key,operation,input_hash,created_by)
 values(p_organization_id,p_request_id,auth.uid(),'user:'||auth.uid(),'H10:'||p_operation,fingerprint,auth.uid()) on conflict do nothing;
 select * into existing from public.operation_requests where organization_id=p_organization_id and actor_key='user:'||auth.uid()
  and operation='H10:'||p_operation and request_id=p_request_id for update;
 if existing.input_hash is distinct from fingerprint then perform private.fail('CONFLICT'); end if;
 if existing.status='completed' then return jsonb_build_object('ok',true,'data',existing.result); end if;
 result:=private.h10_apply_command(p_organization_id,auth.uid(),p_request_id,p_operation,p_input);
 update public.operation_requests set status='completed',result=h10_command.result,completed_at=now(),updated_at=now() where id=existing.id;
 return jsonb_build_object('ok',true,'data',result);
exception when raise_exception then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',sqlerrm));
 when unique_violation then return jsonb_build_object('ok',false,'error',jsonb_build_object('code','CONFLICT'));
 when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or check_violation then
 return jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR'));
end $$;

create function public.h10_store_credentials(p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare org uuid:=(p_input->>'organization_id')::uuid; actor uuid:=(p_input->>'actor_id')::uuid;
 company uuid:=(p_input->>'company_id')::uuid; sid uuid:=(p_input->>'session_id')::uuid; req uuid:=(p_input->>'request_id')::uuid;
 conn public.sunat_connections; entry public.operation_requests; job_id uuid; result jsonb; fingerprint text:=p_input->>'fingerprint';
begin
 perform private.h10_service_actor(org,actor,sid,true);
 if not private.h10_eligible(org,company,actor) then perform private.fail('FORBIDDEN'); end if;
 if req is null or fingerprint !~ '^[0-9a-f]{64}$' or p_input->>'consent_version' is distinct from '1'
  or jsonb_typeof(p_input->'encrypted') is distinct from 'object' then perform private.fail('VALIDATION_ERROR'); end if;
 perform pg_advisory_xact_lock(hashtextextended('h10-save:'||company::text,0));
 insert into public.operation_requests(organization_id,request_id,actor_user_id,actor_key,operation,input_hash,created_by)
 values(org,req,actor,'user:'||actor,'H10:SaveCredentials',fingerprint,actor) on conflict do nothing;
 select * into entry from public.operation_requests where organization_id=org and actor_key='user:'||actor
  and operation='H10:SaveCredentials' and request_id=req for update;
 if entry.input_hash is distinct from fingerprint then perform private.fail('CONFLICT'); end if;
 if entry.status='completed' then return jsonb_build_object('ok',true,'data',entry.result); end if;
 select * into conn from public.sunat_connections where organization_id=org and company_id=company for update;
 if coalesce(conn.revision,-1) is distinct from (p_input->>'expected_revision')::int
  or coalesce(conn.credential_version,0)+1 is distinct from (p_input->>'credential_version')::int then perform private.fail('CONFLICT'); end if;
 if conn.id is not null and conn.id is distinct from (p_input->>'connection_id')::uuid then perform private.fail('CONFLICT'); end if;
 update public.sunat_jobs set state='cancelled',finished_at=now(),lease_token=null,lease_expires_at=null
  where connection_id=conn.id and state in ('queued','running');
 insert into public.sunat_connections(id,organization_id,company_id,state,credential_version,consent_version,consented_at,consented_by,created_by,updated_by)
 values((p_input->>'connection_id')::uuid,org,company,'pending_verification',(p_input->>'credential_version')::int,1,now(),actor,actor,actor)
 on conflict(organization_id,company_id) do update set state='pending_verification',credential_version=excluded.credential_version,
  consent_version=1,consented_at=now(),consented_by=actor,revision=public.sunat_connections.revision+1,
  updated_at=now(),updated_by=actor,error_code=null,deleted_at=null,deleted_by=null,deletion_reason=null returning * into conn;
 insert into private.sunat_credentials(organization_id,connection_id,credential_version,encrypted)
 values(org,conn.id,conn.credential_version,p_input->'encrypted')
 on conflict(connection_id) do update set credential_version=excluded.credential_version,encrypted=excluded.encrypted,updated_at=now();
 job_id:=private.h10_enqueue(conn,'verify',req::text,actor,sid);
 result:=jsonb_build_object('resource_id',conn.id,'job_id',job_id,'revision',conn.revision,'state','queued');
 perform private.h10_audit(org,actor,company,req,'sunat.connection.saved','sunat_connections',conn.id,
  jsonb_build_object('credential_version',conn.credential_version,'consent_version',1));
 update public.operation_requests set status='completed',result=h10_store_credentials.result,completed_at=now(),updated_at=now() where id=entry.id;
 return jsonb_build_object('ok',true,'data',result);
exception when raise_exception then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',sqlerrm));
 when unique_violation then return jsonb_build_object('ok',false,'error',jsonb_build_object('code','CONFLICT'));
 when invalid_text_representation or check_violation or not_null_violation then
 return jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR'));
end $$;
revoke all on function public.h10_command(uuid,uuid,text,jsonb) from public,anon;
grant execute on function public.h10_command(uuid,uuid,text,jsonb) to authenticated;
revoke all on function public.h10_store_credentials(jsonb) from public,anon,authenticated;
grant execute on function public.h10_store_credentials(jsonb) to service_role;
revoke all on function private.h10_service_actor(uuid,uuid,uuid,boolean),
 private.h10_enqueue(public.sunat_connections,text,text,uuid,uuid,date,date,uuid,uuid),
 private.h10_apply_command(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
