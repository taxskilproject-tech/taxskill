-- Explicit block labels disambiguate PL/pgSQL locals from target columns.
create or replace function private.save_role(org uuid, actor uuid, req uuid, input jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
<<body>>
declare result jsonb; role_id uuid; permission_id uuid; relation public.role_permissions;
begin
  if jsonb_typeof(input->'permission_ids')<>'array' then perform private.fail('VALIDATION_ERROR'); end if;
  if input->>'audience'='client' and exists(select 1 from public.permissions where organization_id=org and id in(select value::uuid from jsonb_array_elements_text(input->'permission_ids')) and action in ('approve','observe','reopen')) then perform private.fail('VALIDATION_ERROR'); end if;
  if exists(select 1 from public.access_grants g join public.organization_members m on m.id=g.member_id and m.organization_id=g.organization_id where g.organization_id=org and g.role_id=(input->>'id')::uuid and g.deleted_at is null and m.member_type<>input->>'audience') then perform private.fail('VALIDATION_ERROR'); end if;
  result := private.persist(org,actor,req,'roles',input,array['code','name','description','audience','active']);
  role_id := (result->>'resource_id')::uuid;
  for relation in select * from public.role_permissions rp where rp.organization_id=org and rp.role_id=body.role_id and rp.deleted_at is null and not (input->'permission_ids' @> to_jsonb(rp.permission_id)::jsonb) loop
    perform private.change_lifecycle(org,actor,req,jsonb_build_object('entity','role_permissions','id',relation.id,'expected_revision',relation.revision,'reason','Actualización de plantilla'),false);
  end loop;
  for permission_id in select value::uuid from jsonb_array_elements_text(input->'permission_ids') loop
    select * into relation from public.role_permissions rp where rp.organization_id=org and rp.role_id=body.role_id and rp.permission_id=body.permission_id;
    if relation.id is null then
      perform private.persist(org,actor,req,'role_permissions',jsonb_build_object('role_id',role_id,'permission_id',permission_id),array['role_id','permission_id']);
    elsif relation.deleted_at is not null then
      perform private.change_lifecycle(org,actor,req,jsonb_build_object('entity','role_permissions','id',relation.id,'expected_revision',relation.revision),true);
    end if;
  end loop;
  return result;
end $$;

create or replace function public.h02_command(p_organization_id uuid, p_request_id uuid, p_operation text, p_input jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
<<body>>
declare existing public.operation_requests; result jsonb; fingerprint text := encode(extensions.digest(convert_to(p_input::text,'utf8'),'sha256'),'hex'); error_code text;
begin
  perform private.assert_member(p_organization_id,auth.uid(),true,true);
  perform private.admit_session(p_organization_id);
  perform 1 from public.organizations where id=p_organization_id for update;
  if not (p_operation='RestoreEntity' and p_input->>'entity'='organizations') then perform private.assert_member(p_organization_id,auth.uid(),true); end if;
  if p_input is null or jsonb_typeof(p_input)<>'object' or p_request_id is null then perform private.fail('VALIDATION_ERROR'); end if;
  insert into public.operation_requests(organization_id,request_id,actor_user_id,actor_key,operation,input_hash,created_by)
    values(p_organization_id,p_request_id,auth.uid(),'user:'||auth.uid(),p_operation,fingerprint,auth.uid()) on conflict do nothing;
  select * into existing from public.operation_requests where organization_id=p_organization_id and actor_key='user:'||auth.uid() and operation=p_operation and request_id=p_request_id for update;
  if existing.input_hash<>fingerprint then perform private.fail('CONFLICT'); end if;
  if existing.status='completed' then return jsonb_build_object('ok',true,'data',existing.result); end if;
  begin
    result := private.command(p_organization_id,auth.uid(),p_request_id,p_operation,p_input);
  exception when others then
    error_code := case when sqlstate='23505' or sqlstate='40001' then 'CONFLICT' when sqlstate in ('23502','23503','23514','22P02','22007','22008') then 'VALIDATION_ERROR'
      when sqlstate='P0001' and sqlerrm in ('FORBIDDEN','UNAUTHENTICATED','NOT_FOUND','CONFLICT','VALIDATION_ERROR') then sqlerrm else 'DEPENDENCY_UNAVAILABLE' end;
    update public.operation_requests set status='failed',error_code=body.error_code,updated_at=now(),revision=revision+1 where id=existing.id;
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code',error_code));
  end;
  update public.operation_requests set status='completed',result=body.result,completed_at=now(),error_code=null,updated_at=now(),revision=revision+1 where id=existing.id;
  return jsonb_build_object('ok',true,'data',result);
exception when raise_exception then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',sqlerrm));
end $$;

create or replace function public.h02_admin_finish(p_operation_id uuid, p_input jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
<<body>>
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
  update public.operation_requests set status='completed',result=body.result,resource_id=entry.external_identity_id,completed_at=now(),error_code=null,updated_at=now(),revision=revision+1 where id=entry.id;
  return result;
end $$;
