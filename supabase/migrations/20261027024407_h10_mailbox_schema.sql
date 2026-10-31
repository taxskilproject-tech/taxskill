-- H10 is independent of documentary modules and their compliance engine.
create table public.sunat_connections (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 company_id uuid not null, state text not null default 'pending_verification'
  check(state in ('pending_verification','connected','needs_attention','disconnected')),
 credential_version integer not null default 1 check(credential_version>0),
 daily_enabled boolean not null default false, daily_time time not null default '08:00',
 last_verified_at timestamptz, last_success_at timestamptz, last_daily_success_at timestamptz, last_error_at timestamptz, error_code text,
 consent_version integer not null check(consent_version=1), consented_at timestamptz not null,
 consented_by uuid not null references public.profiles(user_id) on delete restrict,
 revision integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 created_by uuid references public.profiles(user_id) on delete restrict, updated_by uuid references public.profiles(user_id) on delete restrict,
 deleted_at timestamptz, deleted_by uuid references public.profiles(user_id) on delete restrict, deletion_reason text,
 unique(organization_id,id), unique(organization_id,company_id), unique(organization_id,company_id,id),
 check((deleted_at is null and deleted_by is null and deletion_reason is null) or
  (deleted_at is not null and deleted_by is not null and length(btrim(deletion_reason))>0)),
 foreign key(organization_id,company_id) references public.companies(organization_id,id) on delete restrict
);
create table private.sunat_credentials (
 organization_id uuid not null, connection_id uuid primary key, credential_version integer not null,
 encrypted jsonb not null check(jsonb_typeof(encrypted)='object' and encrypted->>'schema_version'='1'
  and encrypted->>'algorithm'='aes-256-gcm' and length(encrypted->>'ciphertext') between 1 and 8192
  and length(encrypted->>'iv')=24 and length(encrypted->>'tag')=32 and encrypted->>'key_id' ~ '^[a-zA-Z0-9_-]{1,40}$'),
 updated_at timestamptz not null default now(),
 foreign key(organization_id,connection_id) references public.sunat_connections(organization_id,id) on delete restrict
);
create table public.sunat_access_grants (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, company_id uuid not null, member_id uuid not null,
 active boolean not null default true, revision integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 created_by uuid references public.profiles(user_id) on delete restrict, updated_by uuid references public.profiles(user_id) on delete restrict,
 deleted_at timestamptz, deleted_by uuid references public.profiles(user_id) on delete restrict, deletion_reason text,
 unique(organization_id,id), unique(organization_id,company_id,member_id),
 check((deleted_at is null and deleted_by is null and deletion_reason is null) or
  (deleted_at is not null and deleted_by is not null and length(btrim(deletion_reason))>0)),
 foreign key(organization_id,company_id) references public.companies(organization_id,id) on delete restrict,
 foreign key(organization_id,member_id) references public.organization_members(organization_id,id) on delete restrict
);
create table public.sunat_jobs (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, company_id uuid not null, connection_id uuid not null,
 kind text not null check(kind in ('verify','monthly','daily','message','attachment')),
 state text not null default 'queued' check(state in ('queued','running','complete','partial','failed','cancelled')),
 request_key text not null check(length(request_key) between 1 and 120), credential_version integer not null,
 from_date date, through_date date, message_id uuid, attachment_id uuid,
 requester_id uuid references public.profiles(user_id) on delete restrict, requester_session uuid,
 worker_id uuid, lease_token uuid, lease_expires_at timestamptz, attempts integer not null default 0 check(attempts between 0 and 3),
 checkpoint jsonb not null default '{}' check(jsonb_typeof(checkpoint)='object' and octet_length(checkpoint::text)<=1048576),
 progress jsonb not null default '{}' check(jsonb_typeof(progress)='object' and octet_length(progress::text)<=8192),
 error_code text, daily_date date, created_at timestamptz not null default now(), started_at timestamptz, finished_at timestamptz,
 unique(organization_id,id), unique(organization_id,connection_id,request_key),
 foreign key(organization_id,company_id,connection_id) references public.sunat_connections(organization_id,company_id,id) on delete restrict,
 check(kind not in ('monthly','daily') or from_date is not null and through_date>=from_date)
);
create unique index h10_one_active_connection_job on public.sunat_jobs(connection_id) where state in ('queued','running');
create index h10_jobs_queue on public.sunat_jobs(created_at,id) where state='queued';
create table public.sunat_messages (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, company_id uuid not null, connection_id uuid not null,
 mailbox text not null check(mailbox in ('notifications','messages')), source_id text not null check(length(source_id) between 1 and 128),
 published_on date not null, published_at timestamptz, subject text not null check(length(subject) between 1 and 1000),
 source_read boolean not null default false, has_attachments boolean not null default false,
 content_text text check(length(content_text)<=200000), details_loaded_at timestamptz,
 first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
 unique(organization_id,id), unique(organization_id,company_id,id), unique(connection_id,mailbox,source_id),
 foreign key(organization_id,company_id,connection_id) references public.sunat_connections(organization_id,company_id,id) on delete restrict
);
create index h10_messages_month on public.sunat_messages(organization_id,company_id,published_on desc,id);
create table public.sunat_attachments (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, company_id uuid not null, message_id uuid not null,
 source_key text not null check(length(source_key) between 1 and 128), filename text not null check(length(filename) between 1 and 250),
 state text not null default 'available' check(state in ('available','cached','failed')),
 mime_type text, byte_size bigint check(byte_size between 0 and 20000000),
 object_name text unique, sha256 text check(sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
 error_code text, created_at timestamptz not null default now(), cached_at timestamptz,
 unique(organization_id,id), unique(organization_id,company_id,id), unique(message_id,source_key),
 foreign key(organization_id,company_id,message_id) references public.sunat_messages(organization_id,company_id,id) on delete restrict,
 check(state<>'cached' or object_name is not null and sha256 is not null and byte_size>0)
);
create table private.sunat_worker_runtime (
 id text primary key check(id='primary'), last_seen_at timestamptz not null,
 mode text not null check(mode in ('sunat','simulator'))
);
create table private.sunat_attachment_sources (
 attachment_id uuid primary key references public.sunat_attachments(id) on delete restrict,
 locator text not null check(locator ~ '^/ol-ti-itvisornoti/visor/bajarArchivo/' and locator !~ '[?#]' and length(locator)<1000)
);
alter table public.sunat_jobs add foreign key(organization_id,company_id,message_id) references public.sunat_messages(organization_id,company_id,id) on delete restrict,
 add foreign key(organization_id,company_id,attachment_id) references public.sunat_attachments(organization_id,company_id,id) on delete restrict;
create table public.sunat_month_queries (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, company_id uuid not null, connection_id uuid not null,
 year integer not null check(year between 1990 and 2200), month integer not null check(month between 1 and 12),
 mailbox text not null check(mailbox in ('notifications','messages')),
 state text not null check(state in ('complete','partial','failed')), last_attempt_at timestamptz not null default now(),
 last_success_at timestamptz, error_code text, message_count integer, job_id uuid not null,
 unique(organization_id,id), unique(connection_id,year,month,mailbox),
 foreign key(organization_id,company_id,connection_id) references public.sunat_connections(organization_id,company_id,id) on delete restrict,
 foreign key(organization_id,job_id) references public.sunat_jobs(organization_id,id) on delete restrict
);
create table public.sunat_notifications (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, company_id uuid not null, connection_id uuid not null,
 recipient_id uuid not null references public.profiles(user_id) on delete restrict, message_id uuid, published_on date,
 event_key text not null, title text not null, body text not null, created_at timestamptz not null default now(), read_at timestamptz,
 unique(connection_id,recipient_id,event_key),
 foreign key(organization_id,company_id,connection_id) references public.sunat_connections(organization_id,company_id,id) on delete restrict,
 foreign key(organization_id,company_id,message_id) references public.sunat_messages(organization_id,company_id,id) on delete restrict,
 foreign key(organization_id,recipient_id) references public.organization_members(organization_id,user_id) on delete restrict
);
revoke all on private.sunat_credentials,private.sunat_attachment_sources,private.sunat_worker_runtime from public,anon,authenticated,service_role;
alter table private.sunat_credentials enable row level security;
alter table private.sunat_attachment_sources enable row level security;
alter table private.sunat_worker_runtime enable row level security;
do $$ declare t text; begin
 foreach t in array array['sunat_connections','sunat_access_grants','sunat_jobs','sunat_messages','sunat_attachments','sunat_month_queries','sunat_notifications'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;
insert into storage.buckets(id,name,public,file_size_limit) values('sunat-mailbox','sunat-mailbox',false,20000000) on conflict(id) do nothing;
do $$ begin if exists(select 1 from storage.buckets where id='sunat-mailbox' and public) then
 raise exception 'SUNAT_STORAGE_MUST_BE_PRIVATE'; end if; end $$;
