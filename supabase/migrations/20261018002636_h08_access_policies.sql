create function private.h08_admin(p_org uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select private.h08_session_valid(p_org) and exists(select 1 from public.organization_members
    where organization_id=p_org and user_id=auth.uid() and is_admin);
$$;
create function private.h08_member(p_org uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select private.h08_session_valid(p_org) and exists(select 1 from public.organizations
    where id=p_org and (status='active' and deleted_at is null or private.h08_admin(p_org)));
$$;
create function private.h08_scope(p_org uuid,p_company uuid,p_module text,p_action text default 'view') returns boolean
language sql stable security definer set search_path='' as $$
  select private.h08_member(p_org) and (
    p_company is not null and exists(select 1 from public.companies c where c.id=p_company and c.organization_id=p_org
      and (private.h08_admin(p_org) or c.status='active' and c.deleted_at is null))
    or p_company is null and p_module='actividades' and exists(select 1 from public.organization_members
      where organization_id=p_org and user_id=auth.uid() and member_type='internal'))
    and (private.h08_admin(p_org) or private.has_permission(p_org,auth.uid(),p_company,p_module,p_action));
$$;
create function private.h08_company(p_org uuid,p_company uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select private.h08_member(p_org) and (private.h08_admin(p_org) or exists(select 1 from public.permissions p
    where p.organization_id=p_org and p.action='view' and private.h08_scope(p_org,p_company,p.module)));
$$;
create function private.h08_profile(p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.organization_members m where m.user_id=p_user
    and private.h08_member(m.organization_id) and (p_user=auth.uid() or private.h08_admin(m.organization_id)));
$$;
create function private.h08_obligation(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.obligations o where o.id=p_id
    and private.h08_scope(o.organization_id,o.company_id,o.module)
    and (o.employment_period_id is null or private.h08_admin(o.organization_id)
      or exists(select 1 from public.employment_periods e join public.workers w on w.id=e.worker_id and w.organization_id=e.organization_id
        where e.id=o.employment_period_id and e.organization_id=o.organization_id and w.deleted_at is null)));
$$;
create function private.h08_deliverable(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.deliverables d where d.id=p_id and private.h08_obligation(d.obligation_id));
$$;
create function private.h08_grant(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.access_grants g join public.organization_members m on m.id=g.member_id and m.organization_id=g.organization_id
    where g.id=p_id and private.h08_member(g.organization_id) and
      (private.h08_admin(g.organization_id) or m.user_id=auth.uid() and g.active and g.deleted_at is null));
$$;
create function private.h08_notice(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.notifications n join public.notification_events e
    on e.id=n.event_id and e.organization_id=n.organization_id where n.id=p_id and n.recipient_id=auth.uid()
      and private.h08_scope(e.organization_id,e.company_id,e.module));
$$;

-- No browser writes. Read access is explicit, with RLS even on resources accessible only through RPC.
revoke all on all tables in schema public from public,anon,authenticated;
revoke all on all sequences in schema public from public,anon,authenticated;
alter default privileges for role postgres in schema public revoke all on tables from public,anon,authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from public,anon,authenticated;
do $$
declare v_table text;
begin
  for v_table in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table public.%I enable row level security',v_table);
  end loop;
end $$;

grant select on public.organizations,public.profiles,public.organization_members,public.companies,public.roles,
  public.permissions,public.role_permissions,public.access_grants,public.grant_permission_overrides,public.company_module_settings,
  public.workers,public.employment_periods,public.document_types,public.requirement_rules,public.rule_versions,public.periods,
  public.obligations,public.deliverables,public.submission_cycles,public.document_versions,public.review_events,
  public.upload_intents,public.notifications,public.app_sessions to authenticated;
create policy h08_read on public.organizations for select to authenticated using(private.h08_member(id));
create policy h08_read on public.profiles for select to authenticated using(private.h08_profile(user_id));
create policy h08_read on public.organization_members for select to authenticated
  using(private.h08_member(organization_id) and (private.h08_admin(organization_id) or user_id=auth.uid() and active and deleted_at is null));
create policy h08_read on public.companies for select to authenticated using(private.h08_company(organization_id,id));
create policy h08_read on public.roles for select to authenticated using(private.h08_admin(organization_id));
create policy h08_read on public.permissions for select to authenticated using(private.h08_member(organization_id));
create policy h08_read on public.role_permissions for select to authenticated using(private.h08_admin(organization_id));
create policy h08_read on public.access_grants for select to authenticated using(private.h08_grant(id));
create policy h08_read on public.grant_permission_overrides for select to authenticated
  using(private.h08_grant(grant_id) and (deleted_at is null or private.h08_admin(organization_id)));
create policy h08_read on public.company_module_settings for select to authenticated
  using(private.h08_admin(organization_id) or deleted_at is null and private.h08_scope(organization_id,company_id,module));
create policy h08_read on public.workers for select to authenticated
  using(private.h08_scope(organization_id,company_id,'laboral_trabajador') and (deleted_at is null or private.h08_admin(organization_id)));
create policy h08_read on public.employment_periods for select to authenticated
  using(private.h08_scope(organization_id,company_id,'laboral_trabajador') and exists(select 1 from public.workers w where w.id=worker_id and w.organization_id=employment_periods.organization_id));
create policy h08_read on public.document_types for select to authenticated using(private.h08_admin(organization_id));
create policy h08_read on public.requirement_rules for select to authenticated using(private.h08_admin(organization_id));
create policy h08_read on public.rule_versions for select to authenticated using(private.h08_admin(organization_id));
create policy h08_read on public.periods for select to authenticated
  using(private.h08_admin(organization_id) or exists(select 1 from public.obligations o where o.period_id=periods.id and o.organization_id=periods.organization_id));
create policy h08_read on public.obligations for select to authenticated using(private.h08_obligation(id));
create policy h08_read on public.deliverables for select to authenticated using(private.h08_obligation(obligation_id));
create policy h08_read on public.submission_cycles for select to authenticated using(private.h08_deliverable(deliverable_id));
create policy h08_read on public.document_versions for select to authenticated using(private.h08_deliverable(deliverable_id));
create policy h08_read on public.review_events for select to authenticated using(private.h08_deliverable(deliverable_id));
create policy h08_read on public.upload_intents for select to authenticated
  using(user_id=auth.uid() and private.h08_deliverable(deliverable_id));
create policy h08_read on public.notifications for select to authenticated
  using(private.h08_notice(id));
-- Event payloads, audit and integration/recovery records remain behind scoped RPCs, with no SELECT grant.
create policy h08_read on public.app_sessions for select to authenticated
  using(private.h08_member(organization_id) and (user_id=auth.uid() or private.h08_admin(organization_id)));

alter view public.h02_users set (security_invoker=true);
alter view public.h03_obligation_summary set (security_invoker=true);
grant select on public.h02_users,public.h03_obligation_summary to authenticated;
grant all on all tables in schema public to service_role;
grant usage on schema private to authenticated;
grant execute on function private.h08_admin(uuid),private.h08_member(uuid),private.h08_scope(uuid,uuid,text,text),
  private.h08_company(uuid,uuid),private.h08_profile(uuid),private.h08_obligation(uuid),private.h08_deliverable(uuid),private.h08_grant(uuid),private.h08_notice(uuid) to authenticated;
