create function private.persist(org uuid, actor uuid, req uuid, target text, input jsonb, allowed text[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare row_id uuid := coalesce((input->>'id')::uuid,gen_random_uuid());
  pk text := case when target='profiles' then 'user_id' else 'id' end;
  before_row jsonb; after_row jsonb; data jsonb; fields text; assignments text;
begin
  execute format('select to_jsonb(t) from public.%I t where %I=$1 for update',target,pk) into before_row using row_id;
  if before_row is not null then
    if target not in ('organizations','profiles') and (before_row->>'organization_id')::uuid<>org then perform private.fail('NOT_FOUND'); end if;
    if (input->>'expected_revision')::integer is distinct from (before_row->>'revision')::integer then perform private.fail('CONFLICT'); end if;
  elsif input ? 'expected_revision' then perform private.fail('NOT_FOUND');
  end if;
  select coalesce(jsonb_object_agg(key,value),'{}') into data from jsonb_each(input) where key=any(allowed);
  data := data || jsonb_build_object(pk,row_id,'updated_by',actor,'updated_at',now(),'revision',coalesce((before_row->>'revision')::integer+1,0));
  if before_row is null then
    data := data || jsonb_build_object('created_by',actor,'created_at',now());
    if target not in ('profiles','organizations') then data := data || jsonb_build_object('organization_id',org); end if;
  end if;
  select string_agg(format('%I',key),','),string_agg(format('%I=v.%I',key,key),',') into fields,assignments from jsonb_each(data);
  if before_row is null then
    execute format('insert into public.%I(%s) select %s from jsonb_populate_record(null::public.%I,$1) returning to_jsonb(%I.*)',target,fields,fields,target,target) into after_row using data;
  else
    execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I,$1) v where t.%I=$2 returning to_jsonb(t)',target,assignments,target,pk) into after_row using data,row_id;
  end if;
  perform private.audit(org,actor,req,case when before_row is null then 'create' else 'update' end,target,row_id,before_row,after_row);
  return jsonb_build_object('schema_version',1,'resource_id',row_id,'revision',(after_row->>'revision')::integer,'status','completed');
end $$;

create function private.save_company(org uuid, actor uuid, req uuid, input jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare old_row public.companies; data jsonb := input; person uuid;
begin
  if input ? 'id' then
    select * into old_row from public.companies where organization_id=org and id=(input->>'id')::uuid;
    if old_row.id is null or old_row.deleted_at is not null then perform private.fail('NOT_FOUND'); end if;
  end if;
  foreach person in array array[(input->>'accountant_id')::uuid,(input->>'supervisor_id')::uuid] loop
    if person is not null and not exists(select 1 from public.organization_members m join public.profiles p on p.user_id=m.user_id
      where m.organization_id=org and m.user_id=person and m.member_type='internal' and m.active and m.deleted_at is null and p.enabled and p.deleted_at is null and p.provisioning_status='ready')
      then perform private.fail('VALIDATION_ERROR'); end if;
  end loop;
  data := data || jsonb_build_object('operation_pauses',private.pause_intervals(old_row.operation_pauses,coalesce(input->>'status',old_row.status,'active')<>'active',coalesce(input->>'status','inactive'),'Cambio administrativo de estado',actor));
  return private.persist(org,actor,req,'companies',data,array['ruc','legal_name','trade_name','address','contact_email','contact_phone','legal_representative','tax_regime','status','accountant_id','supervisor_id','control_start_date','operation_pauses']);
end $$;

create function private.change_lifecycle(org uuid, actor uuid, req uuid, input jsonb, restoring boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare target text := input->>'entity'; pk text; old_row jsonb; data jsonb := input;
begin
  if target <> all(array['organizations','profiles','organization_members','companies','roles','role_permissions','access_grants','grant_permission_overrides','company_module_settings']) then perform private.fail('VALIDATION_ERROR'); end if;
  pk := case when target='profiles' then 'user_id' else 'id' end;
  execute format('select to_jsonb(t) from public.%I t where %I=$1 for update',target,pk) into old_row using (input->>'id')::uuid;
  if old_row is null then perform private.fail('NOT_FOUND'); end if;
  if target='organizations' and (input->>'id')::uuid<>org then perform private.fail('NOT_FOUND'); end if;
  if target='profiles' then
    if not exists(select 1 from public.organization_members where organization_id=org and user_id=(input->>'id')::uuid) then perform private.fail('NOT_FOUND'); end if;
    if not restoring and exists(select 1 from public.organization_members where user_id=(input->>'id')::uuid and active and deleted_at is null) then perform private.fail('FORBIDDEN'); end if;
  end if;
  if restoring and old_row->>'deleted_at' is null then perform private.fail('CONFLICT'); end if;
  if not restoring and (old_row->>'deleted_at' is not null or nullif(btrim(input->>'reason'),'') is null) then perform private.fail('VALIDATION_ERROR'); end if;
  if restoring then
    if target<>'organizations' and not exists(select 1 from public.organizations where id=org and deleted_at is null and status='active') then perform private.fail('FORBIDDEN'); end if;
    if target='organization_members' and not exists(select 1 from public.profiles where user_id=(old_row->>'user_id')::uuid and deleted_at is null) then perform private.fail('FORBIDDEN'); end if;
    if target in ('access_grants','company_module_settings') and old_row->>'company_id' is not null and
      not exists(select 1 from public.companies where organization_id=org and id=(old_row->>'company_id')::uuid and deleted_at is null) then perform private.fail('FORBIDDEN'); end if;
  end if;
  data := data || jsonb_build_object('deleted_at',case when restoring then null else now() end,'deleted_by',case when restoring then null else actor end,'deletion_reason',case when restoring then null else btrim(input->>'reason') end);
  if target in ('organizations','companies') then
    data := data || jsonb_build_object('operation_pauses',private.pause_intervals(old_row->'operation_pauses',not restoring or old_row->>'status'<>'active','soft_delete',coalesce(input->>'reason','Restauración'),actor));
  end if;
  return private.persist(org,actor,req,target,data,array['deleted_at','deleted_by','deletion_reason','operation_pauses']);
end $$;

create function private.save_role(org uuid, actor uuid, req uuid, input jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb; role_id uuid; permission_id uuid; relation public.role_permissions;
begin
  if jsonb_typeof(input->'permission_ids')<>'array' then perform private.fail('VALIDATION_ERROR'); end if;
  if input->>'audience'='client' and exists(select 1 from public.permissions where organization_id=org and id in(select value::uuid from jsonb_array_elements_text(input->'permission_ids')) and action in ('approve','observe','reopen')) then perform private.fail('VALIDATION_ERROR'); end if;
  if exists(select 1 from public.access_grants g join public.organization_members m on m.id=g.member_id and m.organization_id=g.organization_id where g.organization_id=org and g.role_id=(input->>'id')::uuid and g.deleted_at is null and m.member_type<>input->>'audience') then perform private.fail('VALIDATION_ERROR'); end if;
  result := private.persist(org,actor,req,'roles',input,array['code','name','description','audience','active']);
  role_id := (result->>'resource_id')::uuid;
  for relation in select * from public.role_permissions rp where rp.organization_id=org and rp.role_id=save_role.role_id and rp.deleted_at is null and not (input->'permission_ids' @> to_jsonb(rp.permission_id)::jsonb) loop
    perform private.change_lifecycle(org,actor,req,jsonb_build_object('entity','role_permissions','id',relation.id,'expected_revision',relation.revision,'reason','Actualización de plantilla'),false);
  end loop;
  for permission_id in select value::uuid from jsonb_array_elements_text(input->'permission_ids') loop
    select * into relation from public.role_permissions rp where rp.organization_id=org and rp.role_id=save_role.role_id and rp.permission_id=save_role.permission_id;
    if relation.id is null then
      perform private.persist(org,actor,req,'role_permissions',jsonb_build_object('role_id',role_id,'permission_id',permission_id),array['role_id','permission_id']);
    elsif relation.deleted_at is not null then
      perform private.change_lifecycle(org,actor,req,jsonb_build_object('entity','role_permissions','id',relation.id,'expected_revision',relation.revision),true);
    end if;
  end loop;
  return result;
end $$;

create function private.assign_access(org uuid, actor uuid, req uuid, input jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb; grant_id uuid; item jsonb; relation public.grant_permission_overrides;
begin
  if input ? 'overrides' and jsonb_typeof(input->'overrides')<>'array' then perform private.fail('VALIDATION_ERROR'); end if;
  result := private.persist(org,actor,req,'access_grants',input,array['member_id','scope','company_id','module','role_id','active']);
  grant_id := (result->>'resource_id')::uuid;
  for relation in select * from public.grant_permission_overrides ov where ov.organization_id=org and ov.grant_id=assign_access.grant_id and ov.deleted_at is null loop
    perform private.change_lifecycle(org,actor,req,jsonb_build_object('entity','grant_permission_overrides','id',relation.id,'expected_revision',relation.revision,'reason','Sustitución explícita de overrides'),false);
  end loop;
  for item in select value from jsonb_array_elements(coalesce(input->'overrides','[]')) loop
    select * into relation from public.grant_permission_overrides ov where ov.organization_id=org and ov.grant_id=assign_access.grant_id and ov.permission_id=(item->>'permission_id')::uuid;
    perform private.persist(org,actor,req,'grant_permission_overrides',item || jsonb_build_object('grant_id',grant_id) ||
      case when relation.id is null then '{}'::jsonb else jsonb_build_object('id',relation.id,'expected_revision',relation.revision,'deleted_at',null,'deleted_by',null,'deletion_reason',null) end,
      array['grant_id','permission_id','allowed','deleted_at','deleted_by','deletion_reason']);
  end loop;
  return result;
end $$;

create function private.command(org uuid, actor uuid, req uuid, op text, input jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if op='CreateOrUpdateCompany' then return private.save_company(org,actor,req,input);
  elsif op='SaveRole' then return private.save_role(org,actor,req,input);
  elsif op='AssignAccess' then return private.assign_access(org,actor,req,input);
  elsif op in ('DeleteEntity','RestoreEntity') then return private.change_lifecycle(org,actor,req,input,op='RestoreEntity');
  elsif op='SaveModuleSettings' then
    if not exists(select 1 from public.companies where organization_id=org and id=(input->>'company_id')::uuid and deleted_at is null) then perform private.fail('NOT_FOUND'); end if;
    return private.persist(org,actor,req,'company_module_settings',input,array['company_id','module','delivery_responsible_id']);
  elsif op='SaveMembership' then
    if exists(select 1 from public.access_grants g join public.roles r on r.id=g.role_id and r.organization_id=g.organization_id where g.organization_id=org and g.member_id=(input->>'id')::uuid and g.deleted_at is null and (r.audience<>input->>'member_type' or (g.scope='organization' and input->>'member_type'='client'))) then perform private.fail('VALIDATION_ERROR'); end if;
    return private.persist(org,actor,req,'organization_members',input,array['member_type','is_admin','active']);
  elsif op='SaveOrganization' then
    if (input->>'id')::uuid is distinct from org then perform private.fail('NOT_FOUND'); end if;
    return private.persist(org,actor,req,'organizations',input,array['name','settings']);
  end if;
  perform private.fail('VALIDATION_ERROR'); return null;
end $$;

create function public.h02_command(p_organization_id uuid, p_request_id uuid, p_operation text, p_input jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
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
    update public.operation_requests set status='failed',error_code=h02_command.error_code,updated_at=now(),revision=revision+1 where id=existing.id;
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code',error_code));
  end;
  update public.operation_requests set status='completed',result=h02_command.result,completed_at=now(),error_code=null,updated_at=now(),revision=revision+1 where id=existing.id;
  return jsonb_build_object('ok',true,'data',result);
exception when raise_exception then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',sqlerrm));
end $$;
revoke all on all functions in schema private from public,anon,authenticated;
revoke all on function public.h02_command(uuid,uuid,text,jsonb) from public,anon;
grant execute on function public.h02_command(uuid,uuid,text,jsonb) to authenticated;
