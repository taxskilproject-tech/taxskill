-- H07 REV-04: indicator navigation narrows the current universe with AND predicates.
-- No business rows, schedules, table definitions or historical events are changed.
create or replace function private.h07_validate(p_input jsonb) returns void
language plpgsql set search_path='' as $$
declare k text;
begin
  if jsonb_typeof(p_input) is distinct from 'object' then perform private.fail('VALIDATION_ERROR'); end if;
  for k in select jsonb_object_keys(p_input) loop
    if k<>all(array['indicator','indicators','company_id','scope','module','class','state','q','period','year','month','worker_id','document_type_id',
      'due_from','due_to','include_deleted','report','page','pageSize','sort','actor_id','resource','action','from','to']) then perform private.fail('VALIDATION_ERROR'); end if;
  end loop;
  if p_input ? 'indicators' then
    if jsonb_typeof(p_input->'indicators') is distinct from 'array' then perform private.fail('VALIDATION_ERROR'); end if;
    if jsonb_array_length(p_input->'indicators')>5 then perform private.fail('VALIDATION_ERROR'); end if;
    if exists(select 1 from jsonb_array_elements(p_input->'indicators') item
      where jsonb_typeof(item) is distinct from 'string' or item#>>'{}' not in ('pending','review','overdue','upcoming','observed')) then
      perform private.fail('VALIDATION_ERROR');
    end if;
  end if;
  if (p_input->>'indicator' is not null and p_input->>'indicator' not in ('review','overdue','upcoming','observed'))
    or coalesce(p_input->>'scope','all') not in ('all','company','internal')
    or (p_input->>'module' is not null and p_input->>'module' not in ('tributario','laboral_trabajador','laboral_general','actividades'))
    or (p_input->>'class' is not null and p_input->>'class' not in ('documentary','additional'))
    or coalesce(p_input->>'report','detail') not in ('detail','compliance','pending','deadlines','observed','period')
    or (p_input->>'state' is not null and p_input->>'state' not in ('pendiente','por_revisar','observado','aprobado','no_aplica','cancelled'))
    or coalesce(p_input->>'sort','due') not in ('due','title','period')
    or coalesce((p_input->>'page')::integer,1) not between 1 and 100000
    or coalesce((p_input->>'pageSize')::integer,25) not in (25,50,100,500)
    or length(coalesce(p_input->>'q',''))>200
    or (p_input->>'year' is not null and (p_input->>'year')::integer not between 1900 and 9999)
    or (p_input->>'month' is not null and (p_input->>'month')::integer not between 1 and 12)
    or (p_input->>'due_from')::date>(p_input->>'due_to')::date
    or (p_input->>'from')::date>(p_input->>'to')::date then perform private.fail('VALIDATION_ERROR'); end if;
end $$;

create or replace function private.h07_matches_indicator(p_indicator text,p_fact private.h07_facts,p_upcoming_days integer)
returns boolean language sql stable set search_path='' as $$
  select coalesce(case p_indicator
    when 'pending' then p_fact.disposition='active' and p_fact.aggregate_state<>'aprobado'
    when 'review' then p_fact.disposition='active' and p_fact.review_files>0
    when 'observed' then p_fact.disposition='active' and p_fact.observed_count>0
    when 'overdue' then p_fact.overdue
    when 'upcoming' then p_fact.disposition='active' and p_fact.operational_due_date
      between (now() at time zone 'America/Lima')::date and (now() at time zone 'America/Lima')::date+p_upcoming_days
    else false end,false);
$$;

create or replace function private.h07_rows(p_org uuid,p_actor uuid,p_input jsonb,p_action text)
returns setof private.h07_facts language sql stable security definer set search_path='' as $$
  select f.* from private.h07_facts f where f.organization_id=p_org
    and private.h07_visible(p_org,p_actor,f.company_id,f.module,p_action,coalesce((p_input->>'include_deleted')::boolean,false))
    and (p_action<>'reports.export' or private.h07_visible(p_org,p_actor,f.company_id,f.module,'reports.view',coalesce((p_input->>'include_deleted')::boolean,false)))
    and (coalesce((p_input->>'include_deleted')::boolean,false) or f.record_status='active')
    and (p_input->>'company_id' is null or f.company_id=(p_input->>'company_id')::uuid)
    and (coalesce(p_input->>'scope','all')<>'internal' or f.company_id is null)
    and (coalesce(p_input->>'scope','all')<>'company' or f.company_id is not null)
    and (p_input->>'module' is null or f.module=p_input->>'module')
    and (p_input->>'class' is null or f.class=p_input->>'class')
    and (p_input->>'state' is null or f.aggregate_state=p_input->>'state')
    and (p_input->>'worker_id' is null or f.worker_id=(p_input->>'worker_id')::uuid)
    and (p_input->>'document_type_id' is null or f.document_type_id=(p_input->>'document_type_id')::uuid)
    and (p_input->>'period' is null or f.occurrence_key=p_input->>'period')
    and (p_input->>'year' is null or extract(year from f.period_start)=(p_input->>'year')::integer)
    and (p_input->>'month' is null or extract(month from f.period_start)=(p_input->>'month')::integer)
    and (p_input->>'due_from' is null or f.operational_due_date>=(p_input->>'due_from')::date)
    and (p_input->>'due_to' is null or f.operational_due_date<=(p_input->>'due_to')::date)
    and (coalesce(p_input->>'q','')='' or position(lower(p_input->>'q') in lower(concat_ws(' ',f.title,f.scope_name,f.ruc,f.worker_name,f.worker_identity,f.document_type,f.occurrence_key)))>0)
    and not exists (
      select 1 from jsonb_array_elements_text(coalesce(p_input->'indicators','[]'::jsonb)
        || case when p_input->>'indicator' is null then '[]'::jsonb else jsonb_build_array(p_input->>'indicator') end) selected(value)
      where not private.h07_matches_indicator(selected.value,f,
        (select coalesce((settings->>'upcoming_days')::integer,7) from public.organizations where id=p_org))
    )
    and (coalesce(p_input->>'report','detail') in ('detail','compliance','period')
      or p_input->>'report'='pending' and f.disposition='active' and f.aggregate_state<>'aprobado'
      or p_input->>'report'='observed' and f.disposition='active' and f.observed_count>0
      or p_input->>'report'='deadlines' and f.disposition='active' and f.operational_due_date is not null);
$$;

revoke all on function private.h07_matches_indicator(text,private.h07_facts,integer) from public,anon,authenticated;
