create or replace function private.valid_settings(value jsonb) returns boolean language plpgsql immutable as $$
declare formats jsonb; thresholds jsonb;
begin
  if jsonb_typeof(value)<>'object' or value->'schema_version'<>'1'::jsonb then return false; end if;
  if (select count(*) from jsonb_object_keys(value))<>7 or not (value ?& array['schema_version','upcoming_days','digest_local_time','generation_local_time','default_max_file_bytes','allowed_formats','compliance_thresholds']) then return false; end if;
  if jsonb_typeof(value->'upcoming_days')<>'number' or value->>'upcoming_days' !~ '^[0-9]+$' or (value->>'upcoming_days')::integer not between 1 and 365 then return false; end if;
  if jsonb_typeof(value->'digest_local_time')<>'string' or jsonb_typeof(value->'generation_local_time')<>'string' or value->>'digest_local_time' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or value->>'generation_local_time' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then return false; end if;
  if jsonb_typeof(value->'default_max_file_bytes')<>'number' or value->>'default_max_file_bytes' !~ '^[0-9]+$' or (value->>'default_max_file_bytes')::bigint not between 1 and 50000000 then return false; end if;
  formats := value->'allowed_formats'; thresholds := value->'compliance_thresholds';
  if jsonb_typeof(formats)<>'array' or jsonb_array_length(formats)=0 or
    exists(select 1 from jsonb_array_elements_text(formats) f where f<>all(array['pdf','xls','xlsx','doc','docx','jpg','jpeg','png'])) or
    (select count(distinct f) from jsonb_array_elements_text(formats) f)<>jsonb_array_length(formats) then return false; end if;
  if jsonb_typeof(thresholds)<>'object' or (select count(*) from jsonb_object_keys(thresholds))<>2 or not (thresholds ?& array['green','yellow']) then return false; end if;
  if jsonb_typeof(thresholds->'green')<>'number' or jsonb_typeof(thresholds->'yellow')<>'number' or
    thresholds->>'green' !~ '^[0-9]+$' or thresholds->>'yellow' !~ '^[0-9]+$' then return false; end if;
  return (thresholds->>'yellow')::integer >= 0 and (thresholds->>'yellow')::integer < (thresholds->>'green')::integer and (thresholds->>'green')::integer <=100;
exception when others then return false;
end $$;
alter table public.organizations add constraint organizations_settings_contract check (private.valid_settings(settings));

create function private.validate_parent_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.deleted_at is not null then return new; end if;
  if tg_table_name='roles' then
    if new.audience='client' and exists(select 1 from public.role_permissions rp join public.permissions p on p.organization_id=rp.organization_id and p.id=rp.permission_id
      where rp.organization_id=new.organization_id and rp.role_id=new.id and rp.deleted_at is null and p.action in ('approve','observe','reopen')) then perform private.fail('VALIDATION_ERROR'); end if;
    if exists(select 1 from public.access_grants g join public.organization_members m on m.organization_id=g.organization_id and m.id=g.member_id
      where g.organization_id=new.organization_id and g.role_id=new.id and g.deleted_at is null and m.member_type<>new.audience) then perform private.fail('VALIDATION_ERROR'); end if;
  elsif tg_table_name='organization_members' then
    if exists(select 1 from public.access_grants g join public.roles r on r.organization_id=g.organization_id and r.id=g.role_id where g.organization_id=new.organization_id and g.member_id=new.id and g.deleted_at is null
      and (r.audience<>new.member_type or (g.scope='organization' and new.member_type='client'))) then perform private.fail('VALIDATION_ERROR'); end if;
  end if;
  return new;
end $$;
create trigger role_parent_change before update on public.roles for each row execute function private.validate_parent_change();
create trigger member_parent_change before update on public.organization_members for each row execute function private.validate_parent_change();

-- A view supports server-filtered/paginated user lists without another API route.
create view public.h02_users with (security_invoker=true) as
  select m.organization_id,m.id as member_id,p.user_id,p.full_name,p.email,
    (m.deleted_at is not null or p.deleted_at is not null) as deleted,
    to_jsonb(m) as member,to_jsonb(p) as profile
  from public.organization_members m join public.profiles p on p.user_id=m.user_id;
revoke all on public.h02_users from public,anon;
grant select on public.h02_users to authenticated,service_role;
revoke all on all functions in schema private from public,anon,authenticated;

create or replace function private.persist(org uuid, actor uuid, req uuid, target text, input jsonb, allowed text[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare row_id uuid := coalesce((input->>'id')::uuid,gen_random_uuid());
  pk text := case when target='profiles' then 'user_id' else 'id' end;
  before_row jsonb; after_row jsonb; data jsonb; fields text; assignments text;
begin
  execute format('select to_jsonb(t) from public.%I t where %I=$1 for update',target,pk) into before_row using row_id;
  if before_row is not null then
    if target not in ('organizations','profiles') and (before_row->>'organization_id')::uuid<>org then perform private.fail('NOT_FOUND'); end if;
    if (input->>'expected_revision')::integer is distinct from (before_row->>'revision')::integer then perform private.fail('CONFLICT'); end if;
    if before_row->>'deleted_at' is not null and not (input ? 'deleted_at') then perform private.fail('NOT_FOUND'); end if;
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

create or replace function public.h02_context() returns jsonb language plpgsql security definer set search_path = '' as $$
declare member public.organization_members; result jsonb;
begin
  select m.* into member from public.organization_members m join public.profiles p on p.user_id=m.user_id
    where m.user_id=auth.uid() and m.active and m.deleted_at is null and p.enabled and p.deleted_at is null and p.provisioning_status='ready' order by m.created_at,m.id limit 1;
  if member.id is null then perform private.fail('FORBIDDEN'); end if;
  if not member.is_admin then perform private.assert_member(member.organization_id,auth.uid()); end if;
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
