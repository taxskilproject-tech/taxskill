-- H02: integrity and transactional operations. RLS remains scheduled for H08.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  country_code char(2) not null default 'PE' check (country_code ~ '^[A-Z]{2}$'),
  timezone text not null default 'America/Lima' check (timezone = 'America/Lima'),
  status text not null default 'active' check (status in ('active','inactive')),
  settings jsonb not null default '{"schema_version":1,"upcoming_days":7,"digest_local_time":"09:00","generation_local_time":"00:05","default_max_file_bytes":20000000,"allowed_formats":["pdf","xls","xlsx","doc","docx","jpg","jpeg","png"],"compliance_thresholds":{"green":90,"yellow":70}}',
  operation_pauses jsonb not null default '[]' check (jsonb_typeof(operation_pauses) = 'array')
);
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  email text not null check (email = lower(btrim(email)) and email ~ '^[^ @]+@[^ @]+\.[^ @]+$'),
  full_name text not null check (btrim(full_name) <> ''),
  whatsapp_phone text check (whatsapp_phone ~ '^\+[1-9][0-9]{7,14}$'),
  enabled boolean not null default true,
  provisioning_status text not null default 'pending' check (provisioning_status in ('pending','ready','failed'))
);
create unique index profiles_email on public.profiles(lower(email));
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid not null references public.profiles(user_id) on delete restrict,
  member_type text not null check (member_type in ('internal','client')),
  is_admin boolean not null default false,
  active boolean not null default true,
  check (not is_admin or member_type = 'internal'),
  unique (organization_id,id), unique (organization_id,user_id)
);
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  ruc char(11) not null check (ruc ~ '^[0-9]{11}$'),
  legal_name text not null check (btrim(legal_name) <> ''),
  trade_name text, address text, contact_email text, contact_phone text,
  legal_representative text, tax_regime text,
  status text not null default 'active' check (status in ('active','inactive','suspended')),
  accountant_id uuid, supervisor_id uuid,
  control_start_date date not null,
  operation_pauses jsonb not null default '[]' check (jsonb_typeof(operation_pauses) = 'array'),
  unique (organization_id,id), unique (organization_id,ruc),
  foreign key (organization_id,accountant_id) references public.organization_members(organization_id,user_id) on delete restrict,
  foreign key (organization_id,supervisor_id) references public.organization_members(organization_id,user_id) on delete restrict
);
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null check (btrim(name) <> ''), description text,
  audience text not null check (audience in ('internal','client')),
  active boolean not null default true,
  unique (organization_id,id), unique (organization_id,code)
);
create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  module text not null check (module in ('tributario','laboral_trabajador','laboral_general','actividades')),
  action text not null check (action in ('view','upload','download','approve','observe','reopen','waive','reports.view','reports.export','workers.manage','audit.view')),
  description text not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(user_id) on delete restrict,
  check (action <> 'workers.manage' or module = 'laboral_trabajador'),
  unique (organization_id,id), unique (organization_id,module,action)
);
create table public.role_permissions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null,
  role_id uuid not null, permission_id uuid not null,
  unique (organization_id,id), unique (organization_id,role_id,permission_id),
  foreign key (organization_id) references public.organizations(id) on delete restrict,
  foreign key (organization_id,role_id) references public.roles(organization_id,id) on delete restrict,
  foreign key (organization_id,permission_id) references public.permissions(organization_id,id) on delete restrict
);
create table public.access_grants (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null,
  member_id uuid not null, company_id uuid, role_id uuid not null,
  scope text not null check (scope in ('company','organization')),
  module text not null check (module in ('tributario','laboral_trabajador','laboral_general','actividades')),
  active boolean not null default true,
  check ((scope = 'company' and company_id is not null) or (scope = 'organization' and company_id is null and module = 'actividades')),
  unique (organization_id,id),
  foreign key (organization_id) references public.organizations(id) on delete restrict,
  foreign key (organization_id,member_id) references public.organization_members(organization_id,id) on delete restrict,
  foreign key (organization_id,company_id) references public.companies(organization_id,id) on delete restrict,
  foreign key (organization_id,role_id) references public.roles(organization_id,id) on delete restrict
);
create unique index access_grants_company_identity on public.access_grants(organization_id,member_id,company_id,module) where scope = 'company';
create unique index access_grants_internal_identity on public.access_grants(organization_id,member_id,module) where scope = 'organization';
create table public.grant_permission_overrides (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null,
  grant_id uuid not null, permission_id uuid not null, allowed boolean not null,
  unique (organization_id,id), unique (organization_id,grant_id,permission_id),
  foreign key (organization_id) references public.organizations(id) on delete restrict,
  foreign key (organization_id,grant_id) references public.access_grants(organization_id,id) on delete restrict,
  foreign key (organization_id,permission_id) references public.permissions(organization_id,id) on delete restrict
);
create table public.company_module_settings (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null,
  company_id uuid not null, delivery_responsible_id uuid not null,
  module text not null check (module in ('tributario','laboral_trabajador','laboral_general','actividades')),
  unique (organization_id,id), unique (organization_id,company_id,module),
  foreign key (organization_id) references public.organizations(id) on delete restrict,
  foreign key (organization_id,company_id) references public.companies(organization_id,id) on delete restrict,
  foreign key (organization_id,delivery_responsible_id) references public.organization_members(organization_id,user_id) on delete restrict
);

-- Consistent metadata, including the circular profile/organization authorship FKs.
do $$
declare t text;
begin
  foreach t in array array['organizations','profiles','organization_members','companies','roles','role_permissions','access_grants','grant_permission_overrides','company_module_settings'] loop
    execute format('alter table public.%I
      add created_at timestamptz not null default now(),
      add created_by uuid references public.profiles(user_id) on delete restrict,
      add updated_at timestamptz not null default now(),
      add updated_by uuid references public.profiles(user_id) on delete restrict,
      add revision integer not null default 0 check (revision >= 0),
      add deleted_at timestamptz,
      add deleted_by uuid references public.profiles(user_id) on delete restrict,
      add deletion_reason text,
      add check ((deleted_at is null and deleted_by is null and deletion_reason is null)
        or (deleted_at is not null and deleted_by is not null and deletion_reason is not null and btrim(deletion_reason) <> ''''))', t);
  end loop;
end $$;

create table public.app_sessions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null,
  user_id uuid not null, session_id uuid not null,
  registered_at timestamptz not null default now(), last_seen_at timestamptz,
  revoked_at timestamptz, revocation_reason text,
  created_at timestamptz not null default now(), created_by uuid references public.profiles(user_id) on delete restrict,
  updated_at timestamptz not null default now(), updated_by uuid references public.profiles(user_id) on delete restrict,
  revision integer not null default 0 check (revision >= 0),
  unique (organization_id,id), unique (organization_id,session_id),
  foreign key (organization_id) references public.organizations(id) on delete restrict,
  foreign key (organization_id,user_id) references public.organization_members(organization_id,user_id) on delete restrict,
  check ((revoked_at is null and revocation_reason is null) or (revoked_at >= registered_at and btrim(revocation_reason) <> ''))
);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_kind text not null check (actor_kind in ('user','system')),
  actor_user_id uuid references public.profiles(user_id) on delete restrict, system_actor text,
  company_id uuid, module text, action text not null, resource_table text not null,
  resource_id uuid not null, request_id uuid not null, before_values jsonb, after_values jsonb,
  metadata jsonb not null default '{}', created_at timestamptz not null default now(),
  created_by uuid references public.profiles(user_id) on delete restrict,
  unique (organization_id,id),
  foreign key (organization_id,company_id) references public.companies(organization_id,id) on delete restrict,
  check ((actor_kind = 'user' and actor_user_id is not null and system_actor is null) or (actor_kind = 'system' and actor_user_id is null and btrim(system_actor) <> ''))
);
create table public.operation_requests (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  request_id uuid not null, actor_user_id uuid references public.profiles(user_id) on delete restrict,
  actor_key text not null, operation text not null, resource_table text, resource_id uuid,
  input_hash char(64) not null check (input_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'reserved' check (status in ('reserved','processing','completed','failed','compensating')),
  external_identity_id uuid, error_code text, result jsonb, completed_at timestamptz,
  created_at timestamptz not null default now(), created_by uuid references public.profiles(user_id) on delete restrict,
  updated_at timestamptz not null default now(), updated_by uuid references public.profiles(user_id) on delete restrict,
  revision integer not null default 0 check (revision >= 0),
  unique (organization_id,id), unique (organization_id,actor_key,operation,request_id),
  check (status <> 'completed' or (completed_at is not null and result is not null)),
  check (status <> 'failed' or error_code is not null)
);

create index organizations_operating on public.organizations(status) where deleted_at is null;
create index profiles_operating on public.profiles(enabled,provisioning_status) where deleted_at is null;
create index organization_members_operating on public.organization_members(organization_id,active,user_id) where deleted_at is null;
create index companies_operating on public.companies(organization_id,status,legal_name) where deleted_at is null;
create index roles_operating on public.roles(organization_id,active,audience) where deleted_at is null;
create index role_permissions_operating on public.role_permissions(organization_id,role_id) where deleted_at is null;
create index access_grants_operating on public.access_grants(organization_id,member_id,module) where active and deleted_at is null;
create index overrides_operating on public.grant_permission_overrides(organization_id,grant_id) where deleted_at is null;
create index module_settings_responsible on public.company_module_settings(organization_id,delivery_responsible_id) where deleted_at is null;
create index sessions_user on public.app_sessions(organization_id,user_id,registered_at desc);
create index sessions_current on public.app_sessions(organization_id,session_id) where revoked_at is null;
create index audit_time on public.audit_events(organization_id,created_at desc);
create index audit_company on public.audit_events(organization_id,company_id,created_at desc);
create index audit_resource on public.audit_events(organization_id,resource_table,resource_id,created_at);
create index operation_recovery on public.operation_requests(organization_id,status,updated_at);
create index operation_actor on public.operation_requests(organization_id,actor_user_id,created_at desc);

-- Browser writes must use verified RPCs. Read isolation is explicitly H08.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.organizations,public.profiles,public.organization_members,public.companies,public.roles,
  public.permissions,public.role_permissions,public.access_grants,public.grant_permission_overrides,public.company_module_settings to authenticated;
grant all on all tables in schema public to service_role;
