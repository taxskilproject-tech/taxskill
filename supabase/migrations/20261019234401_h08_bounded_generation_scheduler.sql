-- Technical progress only: no new business entity, job activation or historical rewrite.
create table private.h08_generation_progress (
  organization_id uuid primary key references public.organizations(id) on delete restrict,
  last_attempt_at timestamptz not null,
  last_progress_at timestamptz,
  status text not null check(status in ('idle','pending','completed','failed')),
  error_code text check(error_code is null or error_code='DEPENDENCY_UNAVAILABLE')
);
alter table private.h08_generation_progress enable row level security;
revoke all on private.h08_generation_progress from public,anon,authenticated;

create function private.h08_pending_rule(p_org uuid) returns uuid
language sql stable security definer set search_path='' as $$
  select r.id from public.requirement_rules r
  left join public.companies c on c.id=r.company_id
  left join public.document_types d on d.id=r.document_type_id
  where r.organization_id=p_org
    and (r.company_id is null or c.deleted_at is null and c.status='active')
    and (r.class='additional' or d.deleted_at is null and d.active)
    and private.h04_rule_pending(r,(now() at time zone 'America/Lima')::date)
  order by (r.generation_cursor->>'last_attempt_at')::timestamptz nulls first,r.id limit 1;
$$;

create function private.h08_pending_employment(p_org uuid) returns uuid
language sql stable security definer set search_path='' as $$
  select e.id from public.employment_periods e
  join public.workers w on w.id=e.worker_id join public.companies c on c.id=e.company_id
  where e.organization_id=p_org and w.deleted_at is null and c.deleted_at is null and c.status='active'
    and exists(select 1 from jsonb_each(e.document_generation) j where j.key<>'schema_version'
      and j.value->>'status' in ('pending','failed')
      and (j.value->>'reference_date')::date<=(now() at time zone 'America/Lima')::date)
  order by (select max((j.value->>'last_attempt_at')::timestamptz) from jsonb_each(e.document_generation) j
    where j.key<>'schema_version' and j.value->>'status' in ('pending','failed')) nulls first,e.id limit 1;
$$;

create or replace function public.h08_generation_tick() returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_org uuid; v_rule uuid; v_stage uuid; v_documents jsonb:='{"status":"idle"}';
  v_employment jsonb:='{"status":"idle"}'; v_error boolean:=false; v_progress boolean:=false;
  v_status text; v_claims text:=current_setting('request.jwt.claims',true); v_assignments integer:=0;
begin
  if auth.role() is distinct from 'service_role' and session_user not in ('postgres','supabase_admin') then perform private.fail('FORBIDDEN'); end if;
  if not pg_try_advisory_xact_lock(hashtextextended('taxskill:h08-generation',0)) then return '{"status":"busy"}'::jsonb; end if;
  -- One study and at most 100 destinations per engine. Rotate even when a study fails.
  select o.id into v_org from public.organizations o
  left join private.h08_generation_progress p on p.organization_id=o.id
  where o.status='active' and o.deleted_at is null
    and (now() at time zone 'America/Lima')::time>=(o.settings->>'generation_local_time')::time
  order by p.last_attempt_at nulls first,o.id limit 1 for update of o skip locked;
  if v_org is null then return '{"status":"idle"}'::jsonb; end if;
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  v_rule:=private.h08_pending_rule(v_org);
  v_stage:=private.h08_pending_employment(v_org);
  begin
    if v_rule is not null then
      v_documents:=public.h04_run_generation(v_rule,100);
    else
      v_assignments:=private.h04_reconcile_assignments(v_org,100);
    end if;
    v_error:=coalesce(v_documents->>'ok','true')='false' or coalesce(v_documents->'result'->>'status','')='failed';
    v_progress:=coalesce((v_documents->'result'->>'processed_count')::integer,0)>0
      or coalesce((v_documents->>'assignment_updates')::integer,0)>0 or v_assignments>0;
  exception when others then
    v_error:=true; v_documents:='{"status":"failed","error_code":"DEPENDENCY_UNAVAILABLE"}';
  end;
  begin
    if v_stage is not null then
      v_employment:=public.h05_run_generation(v_stage,100);
      v_error:=v_error or v_employment->>'status'='failed';
      v_progress:=v_progress or v_employment->>'status' in ('completed','pending');
    end if;
  exception when others then
    v_error:=true; v_employment:='{"status":"failed","error_code":"DEPENDENCY_UNAVAILABLE"}';
  end;
  v_status:=case when v_error then 'failed'
    when private.h08_pending_rule(v_org) is not null or private.h08_pending_employment(v_org) is not null then 'pending'
    when v_progress then 'completed' else 'idle' end;
  insert into private.h08_generation_progress(organization_id,last_attempt_at,last_progress_at,status,error_code)
  values(v_org,clock_timestamp(),case when v_progress then clock_timestamp() end,v_status,case when v_error then 'DEPENDENCY_UNAVAILABLE' end)
  on conflict(organization_id) do update set last_attempt_at=excluded.last_attempt_at,
    last_progress_at=coalesce(excluded.last_progress_at,h08_generation_progress.last_progress_at),status=excluded.status,error_code=excluded.error_code;
  perform set_config('request.jwt.claims',coalesce(v_claims,''),true);
  return jsonb_build_object('status',v_status,'organization_id',v_org,'documents',v_documents,'employment',v_employment);
end $$;
revoke all on function private.h08_pending_rule(uuid),private.h08_pending_employment(uuid) from public,anon,authenticated;
revoke all on function public.h08_generation_tick() from public,anon,authenticated;
grant execute on function public.h08_generation_tick() to service_role;
