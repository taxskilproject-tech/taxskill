-- H09: organization-scoped, versioned defaults. Existing companies remain legacy.
create table public.deliverable_templates (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  regime_code text not null check(regime_code in ('nuevo_rus','rer','mype','rg','renta_4ta','renta_1ra','renta_2da','renta_5ta')),
  published_version_id uuid, revision integer not null default 0,
  created_at timestamptz not null default now(), created_by uuid references public.profiles(user_id) on delete restrict,
  updated_at timestamptz not null default now(), updated_by uuid references public.profiles(user_id) on delete restrict,
  deleted_at timestamptz, deleted_by uuid references public.profiles(user_id) on delete restrict, deletion_reason text,
  unique(organization_id,id), unique(organization_id,regime_code)
);
create table public.deliverable_template_versions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null,
  template_id uuid not null, version_number integer not null check(version_number>0), revision integer not null default 0,
  items jsonb not null default '[]' check(jsonb_typeof(items)='array' and jsonb_array_length(items)<=200),
  published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(user_id) on delete restrict, updated_by uuid references public.profiles(user_id) on delete restrict,
  unique(organization_id,id), unique(organization_id,template_id,id), unique(template_id,version_number),
  foreign key(organization_id,template_id) references public.deliverable_templates(organization_id,id) on delete restrict
);
alter table public.deliverable_templates add foreign key(organization_id,id,published_version_id)
  references public.deliverable_template_versions(organization_id,template_id,id) on delete restrict;
alter table public.companies add column tax_regime_code text check(tax_regime_code in ('nuevo_rus','rer','mype','rg','renta_4ta','renta_1ra','renta_2da','renta_5ta')),
  add column documentary_profile jsonb, add column document_template_version_id uuid,
  add foreign key(organization_id,document_template_version_id) references public.deliverable_template_versions(organization_id,id) on delete restrict;
alter table public.requirement_rules add column template_version_id uuid,
  add column preparation_pending boolean not null default false,
  add column presentation_order integer check(presentation_order>0),
  add column applicability_key text not null default 'always' check(applicability_key in ('always','plame','afp','sis','essalud')),
  add foreign key(organization_id,template_version_id) references public.deliverable_template_versions(organization_id,id) on delete restrict;
create index h09_company_template on public.companies(organization_id,document_template_version_id);
create index h09_preparation on public.requirement_rules(organization_id,company_id,module) where preparation_pending and deleted_at is null;
create index h09_type_usage on public.requirement_rules(organization_id,document_type_id,company_id) where deleted_at is null;

create function private.h09_profile_valid(profile jsonb) returns boolean language sql immutable set search_path='' as $$
 select coalesce(jsonb_typeof(profile)='object' and profile->>'schema_version'='1'
  and jsonb_typeof(profile->'plame')='boolean' and jsonb_typeof(profile->'afp')='boolean' and jsonb_typeof(profile->'igv_renta')='boolean'
  and profile->>'health_coverage' in ('none','sis','essalud')
  and ((profile->>'plame')::boolean or (profile->>'igv_renta')::boolean)
  and (not (profile->>'afp')::boolean or (profile->>'plame')::boolean)
  and ((profile->>'plame')::boolean or profile->>'health_coverage'='none'),false);
$$;
alter table public.companies add constraint h09_company_profile check(documentary_profile is null or
  (private.h09_profile_valid(documentary_profile) and tax_regime_code is not null and document_template_version_id is not null));
create function private.h09_applies(profile jsonb,mod text,condition text) returns boolean language sql immutable set search_path='' as $$
 select profile is null or (
  (case mod when 'tributario' then coalesce((profile->>'igv_renta')::boolean,false)
    when 'laboral_general' then coalesce((profile->>'plame')::boolean,false)
    when 'laboral_trabajador' then coalesce((profile->>'plame')::boolean,false) else true end)
  and case condition when 'afp' then coalesce((profile->>'afp')::boolean,false)
    when 'sis' then profile->>'health_coverage'='sis' when 'essalud' then profile->>'health_coverage'='essalud'
    when 'plame' then coalesce((profile->>'plame')::boolean,false) else true end);
$$;
create function private.h09_immutable_published() returns trigger language plpgsql set search_path='' as $$
begin
 if old.published_at is not null then perform private.fail('CONFLICT'); end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
create trigger h09_published_immutable before update or delete on public.deliverable_template_versions
 for each row execute function private.h09_immutable_published();
alter table public.deliverable_templates enable row level security;
alter table public.deliverable_template_versions enable row level security;
create policy h09_templates_read on public.deliverable_templates for select to authenticated using(private.h08_admin(organization_id));
create policy h09_versions_read on public.deliverable_template_versions for select to authenticated using(private.h08_admin(organization_id));
grant select on public.deliverable_templates,public.deliverable_template_versions to authenticated;
grant all on public.deliverable_templates,public.deliverable_template_versions to service_role;
revoke all on function private.h09_profile_valid(jsonb),private.h09_applies(jsonb,text,text),private.h09_immutable_published() from public,anon,authenticated;
