create or replace function public.h10_command(p_organization_id uuid,p_request_id uuid,p_operation text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
<<body>>
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
 update public.operation_requests set status='completed',result=body.result,completed_at=now(),updated_at=now() where id=existing.id;
 return jsonb_build_object('ok',true,'data',result);
exception when raise_exception then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',sqlerrm));
 when unique_violation then return jsonb_build_object('ok',false,'error',jsonb_build_object('code','CONFLICT'));
 when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or check_violation then
 return jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR'));
end $$;

create or replace function public.h10_store_credentials(p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
<<body>>
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
 update public.operation_requests set status='completed',result=body.result,completed_at=now(),updated_at=now() where id=entry.id;
 return jsonb_build_object('ok',true,'data',result);
exception when raise_exception then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',sqlerrm));
 when unique_violation then return jsonb_build_object('ok',false,'error',jsonb_build_object('code','CONFLICT'));
 when invalid_text_representation or check_violation or not_null_violation then
 return jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR'));
end $$;
