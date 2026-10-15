create function private.fail(code text) returns void language plpgsql as $$
begin raise exception using errcode = 'P0001', message = code; end $$;

create function private.assert_member(org uuid, actor uuid, admin_required boolean default false, allow_paused boolean default false)
returns public.organization_members language plpgsql security definer set search_path = '' as $$
declare member public.organization_members;
begin
  if actor is null then perform private.fail('UNAUTHENTICATED'); end if;
  select m.* into member from public.organization_members m join public.profiles p on p.user_id=m.user_id
    join public.organizations o on o.id=m.organization_id
    where m.organization_id=org and m.user_id=actor and m.active and m.deleted_at is null
      and p.enabled and p.provisioning_status='ready' and p.deleted_at is null
      and (allow_paused or (o.status='active' and o.deleted_at is null));
  if member.id is null or (admin_required and not member.is_admin) then perform private.fail('FORBIDDEN'); end if;
  return member;
end $$;

create function private.admit_session(org uuid) returns void language plpgsql security definer set search_path = '' as $$
declare sid uuid := (auth.jwt()->>'session_id')::uuid;
begin
  perform private.assert_member(org,auth.uid(),false,true);
  if sid is null then perform private.fail('UNAUTHENTICATED'); end if;
  insert into public.app_sessions(organization_id,user_id,session_id,created_by)
    values(org,auth.uid(),sid,auth.uid()) on conflict(organization_id,session_id) do nothing;
  if exists(select 1 from public.app_sessions where organization_id=org and session_id=sid and (revoked_at is not null or user_id<>auth.uid()))
    then perform private.fail('UNAUTHENTICATED'); end if;
end $$;

create function private.has_permission(org uuid, target_user uuid, company uuid, mod text, act text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m join public.profiles pr on pr.user_id=m.user_id
    join public.organizations o on o.id=m.organization_id
    join public.access_grants g on g.organization_id=m.organization_id and g.member_id=m.id
    join public.roles r on r.organization_id=g.organization_id and r.id=g.role_id
    join public.permissions p on p.organization_id=g.organization_id and p.module=g.module and p.action=act
    left join public.role_permissions rp on rp.organization_id=r.organization_id and rp.role_id=r.id and rp.permission_id=p.id and rp.deleted_at is null
    left join public.grant_permission_overrides ov on ov.organization_id=g.organization_id and ov.grant_id=g.id and ov.permission_id=p.id and ov.deleted_at is null
    left join public.companies c on c.organization_id=g.organization_id and c.id=g.company_id
    where m.organization_id=org and m.user_id=target_user and m.active and m.deleted_at is null
      and pr.enabled and pr.provisioning_status='ready' and pr.deleted_at is null and o.status='active' and o.deleted_at is null
      and g.active and g.deleted_at is null and r.active and r.deleted_at is null and r.audience=m.member_type
      and g.module=mod and g.company_id is not distinct from company
      and ((g.scope='organization' and m.member_type='internal') or (c.deleted_at is null and c.id is not null))
      and not (m.member_type='client' and act in ('approve','observe','reopen'))
      and coalesce(ov.allowed,rp.id is not null)
  );
$$;

create function private.protect_last_admin() returns trigger language plpgsql security definer set search_path = '' as $$
declare org uuid;
begin
  -- Serialize every reduction of effective administrators, including global profile changes.
  for org in select distinct m.organization_id from public.organization_members m
    where (tg_table_name='profiles' and m.user_id=old.user_id)
      or (tg_table_name='organization_members' and m.id=(to_jsonb(old)->>'id')::uuid)
    order by m.organization_id loop
    perform 1 from public.organizations where id=org for update;
    if tg_table_name='profiles' then
      if old.enabled and old.deleted_at is null and (not new.enabled or new.deleted_at is not null or new.provisioning_status<>'ready') then
      if exists(select 1 from public.organization_members where organization_id=org and user_id=old.user_id and is_admin and active and deleted_at is null)
        and not exists(select 1 from public.organization_members m join public.profiles p on p.user_id=m.user_id
          where m.organization_id=org and m.user_id<>old.user_id and m.is_admin and m.active and m.deleted_at is null and p.enabled and p.deleted_at is null and p.provisioning_status='ready')
        then perform private.fail('FORBIDDEN'); end if;
      end if;
    elsif tg_table_name='organization_members' then
      if old.is_admin and old.active and old.deleted_at is null and (not new.is_admin or not new.active or new.deleted_at is not null) and
        not exists(select 1 from public.organization_members m join public.profiles p on p.user_id=m.user_id
          where m.organization_id=org and m.id<>old.id and m.is_admin and m.active and m.deleted_at is null and p.enabled and p.deleted_at is null and p.provisioning_status='ready')
        then perform private.fail('FORBIDDEN'); end if;
    end if;
  end loop;
  return new;
end $$;
create trigger profiles_last_admin before update on public.profiles for each row execute function private.protect_last_admin();
create trigger members_last_admin before update on public.organization_members for each row execute function private.protect_last_admin();

create function private.safe_audit(row_data jsonb) returns jsonb language sql immutable as $$
  select jsonb_object_agg(key,value) from jsonb_each(row_data) where key in
    ('status','enabled','active','revision','deleted_at','deleted_by','deletion_reason','delivery_responsible_id','role_id','permission_id','allowed','name','code','legal_name','member_type','is_admin','audience');
$$;
create function private.audit(org uuid, actor uuid, req uuid, action_name text, table_name text, row_id uuid, before_row jsonb, after_row jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_events(organization_id,actor_kind,actor_user_id,system_actor,action,resource_table,resource_id,request_id,before_values,after_values,metadata,created_by)
    values(org,case when actor is null then 'system' else 'user' end,actor,case when actor is null then 'bootstrap' end,
      action_name,table_name,row_id,req,private.safe_audit(before_row),private.safe_audit(after_row),
      jsonb_build_object('source','rpc','outcome','completed','changed_fields',(select coalesce(jsonb_agg(key),'[]') from jsonb_each(coalesce(after_row,'{}')) where value is distinct from before_row->key)),actor);
$$;

create function private.pause_intervals(pauses jsonb, paused boolean, cause text, reason text, actor uuid)
returns jsonb language plpgsql as $$
declare result jsonb := coalesce(pauses,'[]'); today text := (now() at time zone 'America/Lima')::date::text;
begin
  if paused and not exists(select 1 from jsonb_array_elements(result) p where p->>'resumed_on' is null) then
    return result || jsonb_build_array(jsonb_build_object('paused_from',today,'resumed_on',null,'reason',reason,'actor_id',actor,'cause',cause));
  end if;
  if not paused then
    select coalesce(jsonb_agg(case when p->>'resumed_on' is null then p || jsonb_build_object('resumed_on',today) else p end),'[]') into result from jsonb_array_elements(result) p;
  end if;
  return result;
end $$;

create function private.validate_access() returns trigger language plpgsql security definer set search_path = '' as $$
declare audience text; permission_action text; permission_module text; grant_module text;
begin
  if new.deleted_at is not null then return new; end if;
  if tg_table_name='access_grants' then
    select m.member_type into audience from public.organization_members m join public.profiles p on p.user_id=m.user_id
      where m.organization_id=new.organization_id and m.id=new.member_id and m.active and m.deleted_at is null and p.enabled and p.deleted_at is null and p.provisioning_status='ready';
    if audience is null or not exists(select 1 from public.roles r where r.organization_id=new.organization_id and r.id=new.role_id and r.active and r.deleted_at is null and r.audience=audience)
      or (new.scope='organization' and audience<>'internal')
      or (new.company_id is not null and not exists(select 1 from public.companies where organization_id=new.organization_id and id=new.company_id and deleted_at is null))
      then perform private.fail('VALIDATION_ERROR'); end if;
  elsif tg_table_name='role_permissions' then
    select r.audience into audience from public.roles r where r.organization_id=new.organization_id and r.id=new.role_id and r.deleted_at is null;
    select p.action into permission_action from public.permissions p where p.organization_id=new.organization_id and p.id=new.permission_id;
    if audience is null or (audience='client' and permission_action in ('approve','observe','reopen')) then perform private.fail('VALIDATION_ERROR'); end if;
  elsif tg_table_name='grant_permission_overrides' then
    select m.member_type,g.module into audience,grant_module from public.access_grants g join public.organization_members m on m.organization_id=g.organization_id and m.id=g.member_id
      join public.roles r on r.organization_id=g.organization_id and r.id=g.role_id
      where g.organization_id=new.organization_id and g.id=new.grant_id and g.deleted_at is null and m.deleted_at is null and r.deleted_at is null;
    select p.action,p.module into permission_action,permission_module from public.permissions p where p.organization_id=new.organization_id and p.id=new.permission_id;
    if audience is null or permission_module<>grant_module or (audience='client' and new.allowed and permission_action in ('approve','observe','reopen')) then perform private.fail('VALIDATION_ERROR'); end if;
  elsif tg_table_name='company_module_settings' then
    if not private.has_permission(new.organization_id,new.delivery_responsible_id,new.company_id,new.module,'upload') then perform private.fail('VALIDATION_ERROR'); end if;
  end if;
  return new;
end $$;
do $$ declare t text; begin
  foreach t in array array['access_grants','role_permissions','grant_permission_overrides','company_module_settings'] loop
    execute format('create trigger validate_access before insert or update on public.%I for each row execute function private.validate_access()',t);
  end loop;
end $$;

create function public.h02_context() returns jsonb language plpgsql security definer set search_path = '' as $$
declare member public.organization_members; result jsonb;
begin
  select m.* into member from public.organization_members m join public.profiles p on p.user_id=m.user_id
    where m.user_id=auth.uid() and m.active and m.deleted_at is null and p.enabled and p.deleted_at is null and p.provisioning_status='ready' order by m.created_at,m.id limit 1;
  if member.id is null then perform private.fail('FORBIDDEN'); end if;
  perform private.admit_session(member.organization_id);
  select jsonb_build_object('profile',to_jsonb(p),'member',to_jsonb(member),'organization',to_jsonb(o),
    'companies',(select coalesce(jsonb_agg(to_jsonb(c) order by c.legal_name),'[]') from public.companies c where c.organization_id=o.id and c.deleted_at is null and
      (member.is_admin or exists(select 1 from public.permissions pm where pm.organization_id=o.id and private.has_permission(o.id,auth.uid(),c.id,pm.module,'view')))),
    'capabilities',(select coalesce(jsonb_agg(jsonb_build_object('company_id',g.company_id,'module',pm.module,'action',pm.action)),'[]') from public.access_grants g
      join public.permissions pm on pm.organization_id=g.organization_id and pm.module=g.module
      where g.organization_id=o.id and g.member_id=member.id and private.has_permission(o.id,auth.uid(),g.company_id,pm.module,pm.action)))
    into result from public.profiles p join public.organizations o on o.id=member.organization_id where p.user_id=auth.uid();
  return jsonb_build_object('ok',true,'data',result);
exception when raise_exception then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',sqlerrm));
end $$;

revoke all on all functions in schema private from public,anon,authenticated;
revoke all on function public.h02_context() from public,anon;
grant execute on function public.h02_context() to authenticated;
