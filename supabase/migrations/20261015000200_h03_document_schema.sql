-- H03: documentary persistence, including the dependencies of future employment UI.
create function private.valid_formats(formats text[]) returns boolean language sql immutable as $$
  select coalesce(cardinality(formats)>0 and formats <@ array['pdf','xls','xlsx','doc','docx','jpg','jpeg','png']::text[]
    and cardinality(formats)=(select count(distinct f) from unnest(formats) f),false);
$$;
create function private.valid_specs(specs jsonb, formats text[], maximum bigint) returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb; codes text[] := '{}'; orders integer[] := '{}'; allowed text[];
begin
  if jsonb_typeof(specs)<>'array' or jsonb_array_length(specs)=0 then return false; end if;
  for item in select value from jsonb_array_elements(specs) loop
    select array_agg(value) into allowed from jsonb_array_elements_text(item->'allowed_formats');
    if coalesce(btrim(item->>'position_code'),'')='' or coalesce(btrim(item->>'label'),'')=''
      or not private.valid_formats(allowed) or not allowed <@ formats
      or coalesce((item->>'max_file_bytes')::bigint,0)<=0 or (item->>'max_file_bytes')::bigint>maximum
      or coalesce((item->>'display_order')::integer,0)<1 or item->>'position_code'=any(codes)
      or (item->>'display_order')::integer=any(orders) then return false; end if;
    codes := array_append(codes,item->>'position_code'); orders := array_append(orders,(item->>'display_order')::integer);
  end loop;
  return true;
exception when others then return false;
end $$;

create table public.workers (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  company_id uuid not null, identity_type text not null check(identity_type in ('DNI','CE','PASSPORT','OTHER')),
  identity_number text not null check(btrim(identity_number)<>''), first_names text not null check(btrim(first_names)<>''),
  last_names text not null check(btrim(last_names)<>''), birth_date date, email text, phone text, address text, notes text,
  unique(organization_id,id), unique(organization_id,company_id,id), unique(organization_id,company_id,identity_type,identity_number),
  foreign key(organization_id,company_id) references public.companies(organization_id,id) on delete restrict,
  check(identity_type<>'DNI' or identity_number ~ '^[0-9]{8}$')
);
create table public.employment_periods (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  company_id uuid not null, worker_id uuid not null, sequence_number integer not null check(sequence_number>=1),
  start_date date not null, end_date date, termination_reason text, termination_notes text, position text, department text,
  contract_type text, reference_salary numeric(14,2) check(reference_salary>=0), currency char(3) not null default 'PEN',
  unique(organization_id,id), unique(organization_id,company_id,id), unique(organization_id,worker_id,sequence_number),
  foreign key(organization_id,company_id,worker_id) references public.workers(organization_id,company_id,id) on delete restrict,
  check(end_date is null or end_date>=start_date),
  check((end_date is null and termination_reason is null) or (end_date is not null and termination_reason in ('renuncia','despido','fin_contrato','mutuo_acuerdo','otro')))
);
create unique index employment_one_open on public.employment_periods(organization_id,worker_id) where end_date is null;
create table public.document_types (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null check(btrim(code)<>''), name text not null check(btrim(name)<>''),
  module text not null check(module in ('tributario','laboral_trabajador','laboral_general')), category text, description text,
  suggested_formats text[] not null default array['pdf'] check(private.valid_formats(suggested_formats)), active boolean not null default true,
  unique(organization_id,id), unique(organization_id,id,module), unique(organization_id,code)
);
create table public.requirement_rules (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  class text not null default 'documentary' check(class in ('documentary','additional')), document_type_id uuid, module text not null,
  target_scope text not null check(target_scope in ('company','employment_period','organization')), company_id uuid, employment_period_id uuid,
  title text not null check(btrim(title)<>''), description text, active boolean not null default false,
  inherit_responsible boolean not null default true, delivery_responsible_id uuid references public.profiles(user_id) on delete restrict,
  current_version_id uuid, control_start_date date not null,
  generation_cursor jsonb not null default '{"schema_version":1,"rule_version_id":null,"last_completed_occurrence":null,"processing_occurrence":null,"next_destination_key":null,"last_generated_at":null}',
  operation_pauses jsonb not null default '[]', unique(organization_id,id),
  foreign key(organization_id,document_type_id,module) references public.document_types(organization_id,id,module) on delete restrict,
  foreign key(organization_id,company_id) references public.companies(organization_id,id) on delete restrict,
  foreign key(organization_id,company_id,employment_period_id) references public.employment_periods(organization_id,company_id,id) on delete restrict,
  check((class='documentary' and document_type_id is not null and module in ('tributario','laboral_trabajador','laboral_general')) or (class='additional' and document_type_id is null and module='actividades')),
  check((target_scope='company' and company_id is not null and employment_period_id is null) or (target_scope='employment_period' and company_id is not null and employment_period_id is not null) or (target_scope='organization' and class='additional' and company_id is null and employment_period_id is null)),
  check((inherit_responsible and target_scope<>'organization') or (not inherit_responsible and delivery_responsible_id is not null)),
  check(not active or current_version_id is not null), check(jsonb_typeof(operation_pauses)='array')
);
create table public.rule_versions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  rule_id uuid not null, version_number integer not null check(version_number>=1), effective_from date not null,
  frequency text not null check(frequency in ('unica','diaria','semanal','quincenal','mensual','trimestral','semestral','anual','eventual','personalizada')),
  interval_count integer, interval_unit text, anchor_date date, deadline_offset_days integer not null,
  is_required boolean not null default true, priority text not null default 'media' check(priority in ('alta','media','baja')),
  allowed_formats text[] not null default array['pdf','xls','xlsx','doc','docx','jpg','jpeg','png'] check(private.valid_formats(allowed_formats)),
  max_file_bytes bigint not null default 20000000 check(max_file_bytes>0), deliverable_specs jsonb not null,
  applicability_conditions jsonb not null default '{"schema_version":1,"employment_stage":"any","event_types":[],"termination_reasons":[]}',
  unique(organization_id,id), unique(organization_id,rule_id,id), unique(organization_id,rule_id,version_number),
  foreign key(organization_id,rule_id) references public.requirement_rules(organization_id,id) on delete restrict,
  check(private.valid_specs(deliverable_specs,allowed_formats,max_file_bytes)),
  check((frequency='personalizada' and interval_count>0 and interval_unit in ('days','weeks','months') and anchor_date is not null) or (frequency<>'personalizada' and interval_count is null and interval_unit is null)),
  check(frequency<>'unica' or anchor_date is not null)
);
alter table public.requirement_rules add foreign key(organization_id,id,current_version_id) references public.rule_versions(organization_id,rule_id,id) on delete restrict;
create unique index rule_unique_header on public.requirement_rules(organization_id,current_version_id) where current_version_id is not null;
create table public.periods (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  kind text not null check(kind in ('daily','weekly','fortnightly','monthly','quarterly','semiannual','annual','interval','event','unique')),
  period_key text not null check(btrim(period_key)<>''), start_date date not null, end_date date not null, reference_date date,
  unique(organization_id,id), unique(organization_id,kind,period_key), check(start_date<=end_date),
  check(kind not in ('event','unique') or (reference_date is not null and start_date=reference_date and end_date=reference_date))
);
create table public.obligations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  class text not null check(class in ('documentary','additional')), company_id uuid, employment_period_id uuid, module text not null,
  period_id uuid not null, rule_id uuid, rule_version_id uuid, document_type_id uuid,
  destination_key text not null check(btrim(destination_key)<>''), occurrence_key text not null check(btrim(occurrence_key)<>''), manual_request_id uuid,
  title text not null check(btrim(title)<>''), description text, initial_due_date date not null,
  delivery_responsible_id uuid references public.profiles(user_id) on delete restrict, assignment_issue boolean not null default false,
  priority text not null default 'media' check(priority in ('alta','media','baja')), is_required boolean not null default true,
  disposition text not null default 'active' check(disposition in ('active','no_aplica','cancelled')), disposition_reason text, snapshot jsonb not null,
  unique(organization_id,id), unique(organization_id,id,company_id,module),
  foreign key(organization_id,company_id) references public.companies(organization_id,id) on delete restrict,
  foreign key(organization_id,company_id,employment_period_id) references public.employment_periods(organization_id,company_id,id) on delete restrict,
  foreign key(organization_id,period_id) references public.periods(organization_id,id) on delete restrict,
  foreign key(organization_id,rule_id,rule_version_id) references public.rule_versions(organization_id,rule_id,id) on delete restrict,
  foreign key(organization_id,document_type_id,module) references public.document_types(organization_id,id,module) on delete restrict,
  check((rule_id is null and rule_version_id is null and manual_request_id is not null) or (rule_id is not null and rule_version_id is not null and manual_request_id is null)),
  check((class='documentary' and company_id is not null and document_type_id is not null and module in ('tributario','laboral_trabajador','laboral_general')) or (class='additional' and document_type_id is null and module='actividades')),
  check(employment_period_id is null or (company_id is not null and module='laboral_trabajador')),
  check(delivery_responsible_id is not null or assignment_issue),
  check((disposition='active' and disposition_reason is null) or (disposition<>'active' and disposition_reason is not null and btrim(disposition_reason)<>'')),
  check(snapshot->>'schema_version'='1' and snapshot->>'module'=module and snapshot->>'initial_due_date'=initial_due_date::text)
);
create unique index obligation_generated_unique on public.obligations(organization_id,rule_id,destination_key,occurrence_key) where rule_id is not null;
create unique index obligation_manual_unique on public.obligations(organization_id,manual_request_id) where manual_request_id is not null;
create table public.deliverables (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  obligation_id uuid not null, position_code text not null check(btrim(position_code)<>''), label text not null check(btrim(label)<>''),
  display_order integer not null check(display_order>=1), current_version_id uuid,
  review_state text not null default 'pendiente' check(review_state in ('pendiente','por_revisar','observado','aprobado')),
  unique(organization_id,id), unique(organization_id,obligation_id,position_code), unique(organization_id,obligation_id,display_order),
  foreign key(organization_id,obligation_id) references public.obligations(organization_id,id) on delete restrict,
  check((review_state='pendiente' and current_version_id is null) or (review_state<>'pendiente' and current_version_id is not null))
);
create table public.submission_cycles (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  deliverable_id uuid not null, cycle_number integer not null check(cycle_number>=1),
  reason text not null check(reason in ('initial','correction','reopen')), due_date date not null,
  state text not null default 'open' check(state in ('open','submitted','closed','cancelled')), first_submitted_at timestamptz, closed_at timestamptz,
  unique(organization_id,id), unique(organization_id,deliverable_id,id), unique(organization_id,deliverable_id,cycle_number),
  foreign key(organization_id,deliverable_id) references public.deliverables(organization_id,id) on delete restrict,
  check(cycle_number<>1 or reason='initial'), check(state<>'submitted' or first_submitted_at is not null),
  check((state in ('closed','cancelled') and closed_at is not null) or (state in ('open','submitted') and closed_at is null))
);
create unique index cycle_one_current on public.submission_cycles(organization_id,deliverable_id) where state in ('open','submitted');
create table public.upload_intents (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  deliverable_id uuid not null, cycle_id uuid not null, user_id uuid not null references public.profiles(user_id) on delete restrict,
  request_id uuid not null, reserved_version_id uuid not null unique,
  expected_deliverable_revision integer not null check(expected_deliverable_revision>=0), original_name text not null check(length(original_name) between 1 and 255),
  declared_bytes bigint not null check(declared_bytes>0), declared_mime text not null,
  staging_bucket text not null default 'document-reception', staging_path text not null,
  final_bucket text not null default 'documents', final_path text not null,
  state text not null default 'reserved' check(state in ('reserved','uploaded','validating','ready','rejected','conflict','expired')),
  expires_at timestamptz not null default now()+interval '24 hours', validation_result jsonb, confirmed_version_id uuid, error_code text,
  validation_token uuid, validation_lease_until timestamptz,
  unique(organization_id,id), unique(organization_id,deliverable_id,id), unique(organization_id,user_id,request_id),
  unique(staging_bucket,staging_path), unique(final_bucket,final_path),
  foreign key(organization_id,deliverable_id,cycle_id) references public.submission_cycles(organization_id,deliverable_id,id) on delete restrict,
  check(confirmed_version_id is null or confirmed_version_id=reserved_version_id),
  check(state<>'ready' or (confirmed_version_id is not null and validation_result->>'status'='accepted')),
  check((state='validating' and validation_token is not null and validation_lease_until is not null) or (state<>'validating' and validation_token is null and validation_lease_until is null))
);
create table public.document_versions (
  id uuid primary key, organization_id uuid not null references public.organizations(id) on delete restrict,
  deliverable_id uuid not null, cycle_id uuid not null, upload_intent_id uuid not null unique, version_number integer not null check(version_number>=1),
  storage_bucket text not null default 'documents', storage_path text not null, original_name text not null,
  validated_bytes bigint not null check(validated_bytes>0), validated_mime text not null,
  extension text not null check(extension in ('pdf','xls','xlsx','doc','docx','jpg','jpeg','png')), sha256 char(64) not null check(sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_by uuid not null references public.profiles(user_id) on delete restrict, finalized_at timestamptz not null, comment text,
  unique(organization_id,id), unique(organization_id,deliverable_id,id), unique(organization_id,deliverable_id,id,upload_intent_id),
  unique(organization_id,deliverable_id,version_number), unique(storage_bucket,storage_path),
  foreign key(organization_id,deliverable_id,cycle_id) references public.submission_cycles(organization_id,deliverable_id,id) on delete restrict,
  foreign key(organization_id,deliverable_id,upload_intent_id) references public.upload_intents(organization_id,deliverable_id,id) on delete restrict
);
alter table public.upload_intents add foreign key(organization_id,deliverable_id,confirmed_version_id,id) references public.document_versions(organization_id,deliverable_id,id,upload_intent_id) on delete restrict;
alter table public.deliverables add foreign key(organization_id,id,current_version_id) references public.document_versions(organization_id,deliverable_id,id) on delete restrict;
create unique index deliverable_unique_header on public.deliverables(organization_id,current_version_id) where current_version_id is not null;
create table public.review_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  deliverable_id uuid not null, version_id uuid not null, reviewer_id uuid not null references public.profiles(user_id) on delete restrict,
  decision text not null check(decision in ('approve','observe','reopen')), comment text, new_due_date date,
  before_state text not null, after_state text not null, expected_revision integer not null check(expected_revision>=0),
  resulting_revision integer not null, request_id uuid not null,
  unique(organization_id,id), unique(organization_id,reviewer_id,request_id),
  foreign key(organization_id,deliverable_id,version_id) references public.document_versions(organization_id,deliverable_id,id) on delete restrict,
  check(resulting_revision=expected_revision+1),
  check((decision='approve' and before_state='por_revisar' and after_state='aprobado' and new_due_date is null) or
    (decision='observe' and before_state='por_revisar' and after_state='observado' and new_due_date is not null and comment is not null and btrim(comment)<>'') or
    (decision='reopen' and before_state='aprobado' and after_state='pendiente' and new_due_date is not null and comment is not null and btrim(comment)<>''))
);
create table public.notification_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  event_key text not null, event_type text not null check(event_type in ('assigned','reassigned','upload_finalized','observed','approved','reopened','due_soon','due_today','overdue','assignment_issue')),
  company_id uuid, module text, obligation_id uuid, cycle_id uuid, review_event_id uuid, threshold_days integer, payload jsonb not null,
  unique(organization_id,id), unique(organization_id,event_key),
  foreign key(organization_id,company_id) references public.companies(organization_id,id) on delete restrict,
  foreign key(organization_id,obligation_id) references public.obligations(organization_id,id) on delete restrict,
  foreign key(organization_id,cycle_id) references public.submission_cycles(organization_id,id) on delete restrict,
  foreign key(organization_id,review_event_id) references public.review_events(organization_id,id) on delete restrict,
  check(event_type not in ('observed','approved','reopened') or review_event_id is not null)
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  recipient_id uuid not null references public.profiles(user_id) on delete restrict, event_id uuid not null,
  title text not null, body text not null, target_path text not null check(target_path ~ '^/actividades/[0-9a-f-]{36}$'), read_at timestamptz,
  unique(organization_id,id), unique(organization_id,event_id,recipient_id),
  foreign key(organization_id,event_id) references public.notification_events(organization_id,id) on delete restrict,
  foreign key(organization_id,recipient_id) references public.organization_members(organization_id,user_id) on delete restrict
);

do $$ declare t text; begin
  foreach t in array array['workers','employment_periods','document_types','requirement_rules','obligations','deliverables','submission_cycles','upload_intents','notifications'] loop
    execute format('alter table public.%I add created_at timestamptz not null default now(), add created_by uuid references public.profiles(user_id) on delete restrict,
      add updated_at timestamptz not null default now(), add updated_by uuid references public.profiles(user_id) on delete restrict,
      add revision integer not null default 0 check(revision>=0)',t);
  end loop;
  foreach t in array array['rule_versions','periods','document_versions','review_events','notification_events'] loop
    execute format('alter table public.%I add created_at timestamptz not null default now(), add created_by uuid references public.profiles(user_id) on delete restrict',t);
  end loop;
  foreach t in array array['workers','document_types','requirement_rules'] loop
    execute format('alter table public.%I add deleted_at timestamptz, add deleted_by uuid references public.profiles(user_id) on delete restrict, add deletion_reason text,
      add check((deleted_at is null and deleted_by is null and deletion_reason is null) or (deleted_at is not null and deleted_by is not null and deletion_reason is not null and btrim(deletion_reason)<>''''))',t);
  end loop;
end $$;
alter table public.upload_intents add check(expires_at>created_at);
alter table public.review_events add check(new_due_date is null or new_due_date>=(created_at at time zone 'America/Lima')::date);
create index worker_company on public.workers(organization_id,company_id,last_names,first_names) where deleted_at is null;
create index employment_dates on public.employment_periods(organization_id,worker_id,start_date desc);
create index type_module on public.document_types(organization_id,module,active) where deleted_at is null;
create index rules_company on public.requirement_rules(organization_id,company_id,active) where deleted_at is null;
create index rule_effective on public.rule_versions(organization_id,rule_id,effective_from desc);
create index period_dates on public.periods(organization_id,start_date,end_date);
create index obligation_company on public.obligations(organization_id,company_id,module,period_id);
create index obligation_responsible on public.obligations(organization_id,delivery_responsible_id,disposition);
create index obligation_due on public.obligations(organization_id,initial_due_date) where disposition='active';
create index deliverable_state on public.deliverables(organization_id,review_state,obligation_id);
create index cycle_due on public.submission_cycles(organization_id,due_date,deliverable_id) where state='open';
create index intent_expiry on public.upload_intents(expires_at) where state in ('reserved','uploaded','rejected','conflict','expired');
create index intent_owner on public.upload_intents(organization_id,user_id,state);
create index versions_time on public.document_versions(organization_id,finalized_at desc);
create index review_version on public.review_events(organization_id,version_id,created_at);
create index event_obligation on public.notification_events(organization_id,obligation_id,created_at);
create index notification_recipient on public.notifications(organization_id,recipient_id,created_at desc);
create index notification_unread on public.notifications(organization_id,recipient_id) where read_at is null;

-- Privileges are explicit even while row policies remain deferred to H08.
revoke all on public.workers,public.employment_periods,public.document_types,public.requirement_rules,public.rule_versions,public.periods,
  public.obligations,public.deliverables,public.submission_cycles,public.upload_intents,public.document_versions,public.review_events,
  public.notification_events,public.notifications from anon,authenticated;
grant select on public.document_types,public.requirement_rules,public.rule_versions,public.periods,public.obligations,public.deliverables,
  public.submission_cycles,public.upload_intents,public.document_versions,public.review_events to authenticated;
grant all on public.workers,public.employment_periods,public.document_types,public.requirement_rules,public.rule_versions,public.periods,
  public.obligations,public.deliverables,public.submission_cycles,public.upload_intents,public.document_versions,public.review_events,
  public.notification_events,public.notifications to service_role;
revoke all on function private.valid_formats(text[]),private.valid_specs(jsonb,text[],bigint) from public,anon,authenticated;
-- CHECK functions need execution for trusted inserts only.
grant execute on function private.valid_formats(text[]),private.valid_specs(jsonb,text[],bigint) to service_role;
