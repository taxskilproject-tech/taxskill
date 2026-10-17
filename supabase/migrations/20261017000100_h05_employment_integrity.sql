-- Employment lifecycle: identity survives soft delete; periods are never removed.
alter table public.workers add column operation_pauses jsonb not null default '[]' check(jsonb_typeof(operation_pauses)='array');
alter table public.employment_periods add column document_generation jsonb not null default '{"schema_version":1,"hire":null,"termination":null,"reconcile":null}'
  check(jsonb_typeof(document_generation)='object' and document_generation->>'schema_version'='1');
alter table public.employment_periods add constraint employment_termination_pair check(
  (end_date is null and termination_reason is null) or (end_date is not null and termination_reason is not null));
alter table public.employment_periods add constraint employment_currency check(currency ~ '^[A-Z]{3}$');
create index workers_company_name on public.workers(organization_id,company_id,last_names,first_names) where deleted_at is null;
create index employment_worker_dates on public.employment_periods(organization_id,worker_id,start_date desc);
create index employment_company_dates on public.employment_periods(organization_id,company_id,start_date);

create function private.h05_worker_identity() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='UPDATE' and (new.organization_id,new.company_id) is distinct from (old.organization_id,old.company_id) then perform private.fail('FORBIDDEN'); end if;
  new.identity_number:=upper(regexp_replace(btrim(new.identity_number),'\s+','','g'));
  new.first_names:=btrim(new.first_names); new.last_names:=btrim(new.last_names);
  if length(new.identity_number)>40 or new.identity_number !~ '^[A-Z0-9.-]+$' or length(new.first_names)>150 or length(new.last_names)>150 then perform private.fail('VALIDATION_ERROR'); end if;
  return new;
end $$;
create trigger worker_identity before insert or update on public.workers for each row execute function private.h05_worker_identity();

create function private.h05_employment_dates() returns trigger language plpgsql set search_path='' as $$
begin
  perform 1 from public.workers where organization_id=new.organization_id and id=new.worker_id for update;
  if tg_op='UPDATE' and (new.organization_id,new.company_id,new.worker_id,new.sequence_number) is distinct from (old.organization_id,old.company_id,old.worker_id,old.sequence_number) then perform private.fail('FORBIDDEN'); end if;
  if exists(select 1 from public.employment_periods e where e.organization_id=new.organization_id and e.worker_id=new.worker_id and e.id<>new.id
    and daterange(e.start_date,e.end_date,'[]') && daterange(new.start_date,new.end_date,'[]')) then perform private.fail('CONFLICT'); end if;
  return new;
end $$;
create trigger employment_dates before insert or update of start_date,end_date,worker_id,company_id,organization_id,sequence_number on public.employment_periods for each row execute function private.h05_employment_dates();
create trigger employment_keep_history before delete on public.employment_periods for each row execute function private.keep_document_history();

create function private.h05_company_access(p_org uuid,p_company uuid,p_actor uuid,p_action text) returns public.companies
language plpgsql security definer set search_path='' as $$
declare v_company public.companies; v_member public.organization_members;
begin
  v_member:=private.assert_member(p_org,p_actor);
  select * into v_company from public.companies where organization_id=p_org and id=p_company and deleted_at is null;
  if v_company.id is null then perform private.fail('NOT_FOUND'); end if;
  if not ((p_action='view' and v_member.is_admin) or private.has_permission(p_org,p_actor,p_company,'laboral_trabajador',p_action)) then perform private.fail('FORBIDDEN'); end if;
  if p_action<>'view' and v_company.status<>'active' then perform private.fail('FORBIDDEN'); end if;
  return v_company;
end $$;

create function private.h05_generation_event(p_id uuid,p_type text,p_occurred date,p_reference date,p_skip boolean default false) returns jsonb
language sql volatile set search_path='' as $$
  select jsonb_build_object('event_id',p_id,'event_type',p_type,'occurred_on',p_occurred,'reference_date',p_reference,'requested_at',now(),
    'last_rule_id',null,'status',case when p_skip then 'skipped' else 'pending' end,'last_error',null,'last_attempt_at',null,'generated_count',0);
$$;
revoke all on function private.h05_worker_identity(),private.h05_employment_dates(),private.h05_company_access(uuid,uuid,uuid,text),private.h05_generation_event(uuid,text,date,date,boolean) from public,anon,authenticated;
