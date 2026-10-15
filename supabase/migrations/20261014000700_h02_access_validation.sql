create or replace function private.validate_access() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_audience text; permission_action text; permission_module text; grant_module text;
begin
  if new.deleted_at is not null then return new; end if;
  if tg_table_name='access_grants' then
    select m.member_type into v_audience from public.organization_members m join public.profiles p on p.user_id=m.user_id
      where m.organization_id=new.organization_id and m.id=new.member_id and m.active and m.deleted_at is null and p.enabled and p.deleted_at is null and p.provisioning_status='ready';
    if v_audience is null or not exists(select 1 from public.roles r where r.organization_id=new.organization_id and r.id=new.role_id and r.active and r.deleted_at is null and r.audience=v_audience)
      or (new.scope='organization' and v_audience<>'internal')
      or (new.company_id is not null and not exists(select 1 from public.companies where organization_id=new.organization_id and id=new.company_id and deleted_at is null))
      then perform private.fail('VALIDATION_ERROR'); end if;
  elsif tg_table_name='role_permissions' then
    select r.audience into v_audience from public.roles r where r.organization_id=new.organization_id and r.id=new.role_id and r.deleted_at is null;
    select p.action into permission_action from public.permissions p where p.organization_id=new.organization_id and p.id=new.permission_id;
    if v_audience is null or (v_audience='client' and permission_action in ('approve','observe','reopen')) then perform private.fail('VALIDATION_ERROR'); end if;
  elsif tg_table_name='grant_permission_overrides' then
    select m.member_type,g.module into v_audience,grant_module from public.access_grants g join public.organization_members m on m.organization_id=g.organization_id and m.id=g.member_id
      join public.roles r on r.organization_id=g.organization_id and r.id=g.role_id
      where g.organization_id=new.organization_id and g.id=new.grant_id and g.deleted_at is null and m.deleted_at is null and r.deleted_at is null;
    select p.action,p.module into permission_action,permission_module from public.permissions p where p.organization_id=new.organization_id and p.id=new.permission_id;
    if v_audience is null or permission_module<>grant_module or (v_audience='client' and new.allowed and permission_action in ('approve','observe','reopen')) then perform private.fail('VALIDATION_ERROR'); end if;
  elsif tg_table_name='company_module_settings' then
    if not private.has_permission(new.organization_id,new.delivery_responsible_id,new.company_id,new.module,'upload') then perform private.fail('VALIDATION_ERROR'); end if;
  end if;
  return new;
end $$;
