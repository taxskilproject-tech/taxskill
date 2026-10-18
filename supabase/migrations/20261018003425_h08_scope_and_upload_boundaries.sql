create or replace function private.h08_session_id() returns uuid
language sql stable set search_path='' as $$
  select case when auth.jwt()->>'session_id' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then (auth.jwt()->>'session_id')::uuid end;
$$;

create or replace function private.has_permission(org uuid,target_user uuid,company uuid,mod text,act text) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.organization_members m join public.profiles pr on pr.user_id=m.user_id
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
      and ((g.scope='organization' and m.member_type='internal') or c.deleted_at is null and c.id is not null and c.status='active')
      and not (m.member_type='client' and act in ('approve','observe','reopen')) and coalesce(ov.allowed,rp.id is not null));
$$;

create or replace function private.document_access(org uuid,obligation uuid,actor uuid,action_name text) returns public.obligations
language plpgsql security definer set search_path='' as $$
declare v_result public.obligations; v_member public.organization_members;
begin
  v_member:=private.assert_member(org,actor);
  select * into v_result from public.obligations where organization_id=org and id=obligation;
  if v_result.id is null or not private.h06_visible(org,actor,v_result.company_id,v_result.module)
    or (action_name<>'view' and not private.has_permission(org,actor,v_result.company_id,v_result.module,action_name))
    or (not v_member.is_admin and v_result.employment_period_id is not null and exists(select 1 from public.employment_periods e
      join public.workers w on w.organization_id=e.organization_id and w.id=e.worker_id
      where e.id=v_result.employment_period_id and w.deleted_at is not null)) then perform private.fail('NOT_FOUND'); end if;
  return v_result;
end $$;

-- The notification RPC already applies its scoped checks; do not add a raw notice-row API.
revoke select on public.notifications from authenticated;
revoke select on public.upload_intents from authenticated;
grant select(id,organization_id,deliverable_id,cycle_id,user_id,original_name,declared_bytes,expected_deliverable_revision,
  state,expires_at,error_code,confirmed_version_id) on public.upload_intents to authenticated;

create or replace function public.h03_upload_context(p_intent_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare intent public.upload_intents; obligation public.obligations;
begin
  select * into intent from public.upload_intents where id=p_intent_id and user_id=auth.uid();
  if intent.id is null then perform private.fail('NOT_FOUND'); end if;
  perform private.admit_session(intent.organization_id);
  obligation:=private.document_access(intent.organization_id,(select obligation_id from public.deliverables where id=intent.deliverable_id),auth.uid(),'upload');
  return jsonb_build_object('intent',(to_jsonb(intent)-'validation_lease_until')||'{"validation_token":null}'::jsonb,
    'specs',(select value from jsonb_array_elements(obligation.snapshot->'deliverables') where value->>'position_code'=(select position_code from public.deliverables where id=intent.deliverable_id)));
end $$;
alter function public.h03_query(uuid,text,jsonb) set schema private;
alter function private.h03_query(uuid,text,jsonb) rename to h08_document_query;
create function public.h03_query(p_organization_id uuid,p_resource text,p_input jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_result jsonb;
begin
  v_result:=private.h08_document_query(p_organization_id,p_resource,p_input);
  if jsonb_typeof(v_result->'data'->'intents')='array' then
    v_result:=jsonb_set(v_result,'{data,intents}',coalesce((select jsonb_agg((i-'validation_lease_until')||'{"validation_token":null}'::jsonb)
      from jsonb_array_elements(v_result->'data'->'intents') i),'[]'::jsonb));
  end if;
  return v_result;
end $$;
revoke all on function private.h08_document_query(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.h03_query(uuid,text,jsonb) from public,anon;
grant execute on function public.h03_query(uuid,text,jsonb) to authenticated,service_role;
