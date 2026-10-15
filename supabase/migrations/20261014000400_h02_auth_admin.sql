-- Only service_role may invoke these functions; the server verifies the real actor first.
create function public.h02_admin_prepare(p_organization_id uuid, p_actor_id uuid, p_request_id uuid, p_operation text, p_input_hash text, p_target_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare entry public.operation_requests; recent integer;
begin
  if auth.role()<>'service_role' then perform private.fail('FORBIDDEN'); end if;
  perform private.assert_member(p_organization_id,p_actor_id,true);
  perform 1 from public.organizations where id=p_organization_id for update;
  if p_operation not in ('CreateUser','SetUserPassword','SetUserEnabled') or p_input_hash !~ '^[0-9a-f]{64}$' then perform private.fail('VALIDATION_ERROR'); end if;
  if p_operation<>'CreateUser' and not exists(select 1 from public.organization_members where organization_id=p_organization_id and user_id=p_target_id) then perform private.fail('NOT_FOUND'); end if;
  insert into public.operation_requests(organization_id,request_id,actor_user_id,actor_key,operation,input_hash,external_identity_id,resource_table,resource_id,created_by)
    values(p_organization_id,p_request_id,p_actor_id,'user:'||p_actor_id,p_operation,p_input_hash,
      case when p_operation='CreateUser' then gen_random_uuid() else p_target_id end,'profiles',p_target_id,p_actor_id) on conflict do nothing;
  select * into entry from public.operation_requests where organization_id=p_organization_id and actor_key='user:'||p_actor_id and operation=p_operation and request_id=p_request_id for update;
  if entry.input_hash<>p_input_hash then perform private.fail('CONFLICT'); end if;
  if entry.status='completed' then return to_jsonb(entry); end if;
  if entry.status='processing' and entry.updated_at>now()-interval '2 minutes' then perform private.fail('CONFLICT'); end if;
  select count(*) into recent from public.operation_requests where organization_id=p_organization_id and actor_user_id=p_actor_id and created_at>now()-interval '1 minute';
  if recent>20 then perform private.fail('FORBIDDEN'); end if;
  update public.operation_requests set status='processing',error_code=null,updated_at=now(),revision=revision+1 where id=entry.id returning * into entry;
  return to_jsonb(entry);
end $$;

create function public.h02_admin_stage(p_operation_id uuid, p_input jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare entry public.operation_requests; profile public.profiles;
begin
  if auth.role()<>'service_role' then perform private.fail('FORBIDDEN'); end if;
  select * into entry from public.operation_requests where id=p_operation_id and status='processing' for update;
  if entry.id is null then perform private.fail('CONFLICT'); end if;
  perform private.assert_member(entry.organization_id,entry.actor_user_id,true);
  if entry.operation='CreateUser' then return; end if;
  select * into profile from public.profiles where user_id=entry.external_identity_id for update;
  if profile.deleted_at is not null then perform private.fail('FORBIDDEN'); end if;
  -- A previous failed attempt may already have performed this durable stage.
  if entry.result->>'status'='db_staged' then return; end if;
  if (p_input->>'expected_revision')::integer is distinct from profile.revision then perform private.fail('CONFLICT'); end if;
  if entry.operation='SetUserEnabled' and not (p_input->>'enabled')::boolean then
    update public.profiles set enabled=false,revision=revision+1,updated_at=now(),updated_by=entry.actor_user_id where user_id=profile.user_id;
  end if;
  update public.app_sessions set revoked_at=now(),revocation_reason=entry.operation,updated_at=now(),updated_by=entry.actor_user_id,revision=revision+1
    where user_id=profile.user_id and revoked_at is null;
  update public.operation_requests set result=jsonb_build_object('schema_version',1,'user_id',profile.user_id,'status','db_staged'),revision=revision+1 where id=entry.id;
end $$;

create function public.h02_admin_finish(p_operation_id uuid, p_input jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare entry public.operation_requests; member_id uuid; result jsonb; item jsonb; previous jsonb;
begin
  if auth.role()<>'service_role' then perform private.fail('FORBIDDEN'); end if;
  select * into entry from public.operation_requests where id=p_operation_id for update;
  if entry.status='completed' then return entry.result; end if;
  if entry.status<>'processing' then perform private.fail('CONFLICT'); end if;
  perform private.assert_member(entry.organization_id,entry.actor_user_id,true);
  perform 1 from public.organizations where id=entry.organization_id for update;
  select to_jsonb(p) into previous from public.profiles p where p.user_id=entry.external_identity_id;
  if entry.operation='CreateUser' then
    insert into public.profiles(user_id,email,full_name,whatsapp_phone,enabled,provisioning_status,created_by,updated_by)
      values(entry.external_identity_id,p_input->>'email',p_input->>'full_name',nullif(p_input->>'whatsapp_phone',''),true,'ready',entry.actor_user_id,entry.actor_user_id);
    insert into public.organization_members(organization_id,user_id,member_type,is_admin,created_by,updated_by)
      values(entry.organization_id,entry.external_identity_id,p_input->>'member_type',coalesce((p_input->>'is_admin')::boolean,false),entry.actor_user_id,entry.actor_user_id) returning id into member_id;
    for item in select value from jsonb_array_elements(coalesce(p_input->'grants','[]')) loop
      perform private.assign_access(entry.organization_id,entry.actor_user_id,entry.request_id,item || jsonb_build_object('member_id',member_id));
    end loop;
    perform private.audit(entry.organization_id,entry.actor_user_id,entry.request_id,'CreateMembership','organization_members',member_id,null,jsonb_build_object('member_type',p_input->>'member_type','is_admin',coalesce((p_input->>'is_admin')::boolean,false)));
  else
    update public.profiles set enabled=case when entry.operation='SetUserEnabled' then (p_input->>'enabled')::boolean else enabled end,
      updated_at=now(),updated_by=entry.actor_user_id,revision=revision+1 where user_id=entry.external_identity_id;
  end if;
  perform private.audit(entry.organization_id,entry.actor_user_id,entry.request_id,entry.operation,'profiles',entry.external_identity_id,previous,
    (select to_jsonb(p) from public.profiles p where p.user_id=entry.external_identity_id));
  result := jsonb_build_object('schema_version',1,'user_id',entry.external_identity_id,'resource_id',entry.external_identity_id,'revision',
    (select revision from public.profiles where user_id=entry.external_identity_id),'status','completed');
  update public.operation_requests set status='completed',result=h02_admin_finish.result,resource_id=entry.external_identity_id,completed_at=now(),error_code=null,updated_at=now(),revision=revision+1 where id=entry.id;
  return result;
end $$;

create function public.h02_admin_fail(p_operation_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role()<>'service_role' then perform private.fail('FORBIDDEN'); end if;
  update public.operation_requests set status='failed',error_code='DEPENDENCY_UNAVAILABLE',updated_at=now(),revision=revision+1 where id=p_operation_id and status<>'completed';
end $$;

create function public.h02_bootstrap(p_user_id uuid,p_name text) returns uuid language plpgsql security definer set search_path = '' as $$
declare org uuid; email text;
begin
  if auth.role()<>'service_role' then perform private.fail('FORBIDDEN'); end if;
  perform pg_advisory_xact_lock(20261014);
  if exists(select 1 from public.organizations) then perform private.fail('CONFLICT'); end if;
  select lower(u.email) into email from auth.users u where u.id=p_user_id and u.email_confirmed_at is not null;
  if email is null then perform private.fail('VALIDATION_ERROR'); end if;
  insert into public.profiles(user_id,email,full_name,provisioning_status) values(p_user_id,email,p_name,'ready');
  insert into public.organizations(name,created_by,updated_by) values('Estudio contable',p_user_id,p_user_id) returning id into org;
  insert into public.organization_members(organization_id,user_id,member_type,is_admin,created_by,updated_by) values(org,p_user_id,'internal',true,p_user_id,p_user_id);
  insert into public.permissions(organization_id,module,action,description,created_by)
    select org,m,a,a,p_user_id from unnest(array['tributario','laboral_trabajador','laboral_general','actividades']) m
    cross join unnest(array['view','upload','download','approve','observe','reopen','waive','reports.view','reports.export','workers.manage','audit.view']) a
    where a<>'workers.manage' or m='laboral_trabajador';
  insert into public.roles(organization_id,code,name,audience,created_by,updated_by) values
    (org,'contador','Contador','internal',p_user_id,p_user_id),(org,'supervisor','Supervisor','internal',p_user_id,p_user_id),(org,'cliente','Cliente','client',p_user_id,p_user_id);
  insert into public.role_permissions(organization_id,role_id,permission_id,created_by,updated_by)
    select org,r.id,p.id,p_user_id,p_user_id from public.roles r cross join public.permissions p where r.organization_id=org and p.organization_id=org and
      ((r.code='cliente' and p.action in ('view','upload','download')) or
       (r.code='contador' and p.action in ('view','upload','download','approve','observe','reopen','waive','workers.manage','reports.view','reports.export')) or
       (r.code='supervisor' and p.action in ('view','download','approve','observe','reopen','waive','reports.view','reports.export','audit.view')));
  perform private.audit(org,null,gen_random_uuid(),'Bootstrap','organizations',org,null,jsonb_build_object('name','Estudio contable'));
  return org;
end $$;

create function public.h02_operation_status(p_organization_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_member(p_organization_id,auth.uid(),true);
  perform private.admit_session(p_organization_id);
  return (select coalesce(jsonb_agg(jsonb_build_object('request_id',request_id,'operation',operation,'status',status,'error_code',error_code,'resource_id',resource_id,'updated_at',updated_at) order by updated_at desc),'[]') from
    (select * from public.operation_requests where organization_id=p_organization_id and operation in ('CreateUser','SetUserPassword','SetUserEnabled') order by updated_at desc limit 25) entries);
end $$;

revoke all on all functions in schema private from public,anon,authenticated;
revoke all on function public.h02_admin_prepare(uuid,uuid,uuid,text,text,uuid),public.h02_admin_stage(uuid,jsonb),public.h02_admin_finish(uuid,jsonb),public.h02_admin_fail(uuid),public.h02_bootstrap(uuid,text) from public,anon,authenticated;
grant execute on function public.h02_admin_prepare(uuid,uuid,uuid,text,text,uuid),public.h02_admin_stage(uuid,jsonb),public.h02_admin_finish(uuid,jsonb),public.h02_admin_fail(uuid),public.h02_bootstrap(uuid,text) to service_role;
revoke all on function public.h02_operation_status(uuid) from public,anon;
grant execute on function public.h02_operation_status(uuid) to authenticated;
