-- H04: one deterministic civil calendar, also used by previews and Cron.
create function private.h04_anchor_month(anchor date, months integer) returns date
language sql immutable strict set search_path='' as $$
  select least((date_trunc('month',anchor)+make_interval(months=>months)+(extract(day from anchor)::integer-1)*interval '1 day')::date,
    (date_trunc('month',anchor)+make_interval(months=>months+1)-interval '1 day')::date);
$$;

create function private.h04_calendar(frequency text, on_date date, anchor date default null,
  interval_count integer default null, interval_unit text default null, stable_id text default null) returns jsonb
language plpgsql immutable set search_path='' as $$
declare first_day date; last_day date; kind text; occurrence text; n integer; width integer;
begin
  if on_date is null then raise exception 'VALIDATION_ERROR'; end if;
  case frequency
    when 'diaria' then first_day:=on_date; last_day:=on_date; kind:='daily'; occurrence:=on_date::text;
    when 'semanal' then first_day:=date_trunc('week',on_date)::date; last_day:=first_day+6; kind:='weekly'; occurrence:=to_char(on_date,'IYYY-"W"IW');
    when 'quincenal' then
      first_day:=date_trunc('month',on_date)::date+case when extract(day from on_date)>15 then 15 else 0 end;
      last_day:=case when extract(day from on_date)>15 then (date_trunc('month',on_date)+interval '1 month - 1 day')::date else first_day+14 end;
      kind:='fortnightly'; occurrence:=to_char(on_date,'YYYY-MM')||case when extract(day from on_date)>15 then '-Q2' else '-Q1' end;
    when 'mensual' then first_day:=date_trunc('month',on_date)::date; last_day:=(first_day+interval '1 month - 1 day')::date; kind:='monthly'; occurrence:=to_char(on_date,'YYYY-MM');
    when 'trimestral' then first_day:=date_trunc('quarter',on_date)::date; last_day:=(first_day+interval '3 months - 1 day')::date; kind:='quarterly'; occurrence:=to_char(on_date,'YYYY')||'-T'||extract(quarter from on_date)::integer;
    when 'semestral' then first_day:=make_date(extract(year from on_date)::integer,case when extract(month from on_date)<=6 then 1 else 7 end,1); last_day:=(first_day+interval '6 months - 1 day')::date; kind:='semiannual'; occurrence:=to_char(on_date,'YYYY')||case when extract(month from on_date)<=6 then '-S1' else '-S2' end;
    when 'anual' then first_day:=date_trunc('year',on_date)::date; last_day:=(first_day+interval '1 year - 1 day')::date; kind:='annual'; occurrence:=to_char(on_date,'YYYY');
    when 'unica' then
      if anchor is null then raise exception 'VALIDATION_ERROR'; end if;
      first_day:=anchor; last_day:=anchor; kind:='unique'; occurrence:='unique:'||coalesce(stable_id,anchor::text);
    when 'eventual' then
      if nullif(stable_id,'') is null then raise exception 'VALIDATION_ERROR'; end if;
      first_day:=on_date; last_day:=on_date; kind:='event'; occurrence:='event:'||stable_id;
    when 'personalizada' then
      if anchor is null or interval_count is null or interval_count not between 1 and 1200 or interval_unit not in ('days','weeks','months') then raise exception 'VALIDATION_ERROR'; end if;
      if interval_unit in ('days','weeks') then
        width:=interval_count*case when interval_unit='weeks' then 7 else 1 end;
        n:=floor((on_date-anchor)::numeric/width)::integer;
        first_day:=anchor+n*width; last_day:=first_day+width-1;
      else
        n:=floor(((extract(year from on_date)::integer-extract(year from anchor)::integer)*12+extract(month from on_date)::integer-extract(month from anchor)::integer)::numeric/interval_count)::integer;
        if private.h04_anchor_month(anchor,n*interval_count)>on_date then n:=n-1; end if;
        first_day:=private.h04_anchor_month(anchor,n*interval_count);
        last_day:=private.h04_anchor_month(anchor,(n+1)*interval_count)-1;
      end if;
      kind:='interval'; occurrence:='interval:'||anchor||':'||interval_count||':'||interval_unit||':'||n;
    else raise exception 'VALIDATION_ERROR';
  end case;
  return jsonb_build_object('kind',kind,'key',occurrence,'start_date',first_day,'end_date',last_day,
    'reference_date',case when kind in ('unique','event') then first_day else null end);
end $$;

create function private.h04_conditions_valid(value jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
begin
  return coalesce(jsonb_typeof(value)='object' and value->>'schema_version'='1'
    and value->>'employment_stage' in ('any','ingreso','relacion','cese')
    and jsonb_typeof(value->'event_types')='array' and jsonb_typeof(value->'termination_reasons')='array'
    and not exists(select 1 from jsonb_object_keys(value) k where k not in ('schema_version','employment_stage','event_types','termination_reasons'))
    and not exists(select 1 from jsonb_array_elements_text(value->'event_types') e where e not in ('worker_hired','worker_terminated','manual_request'))
    and not exists(select 1 from jsonb_array_elements_text(value->'termination_reasons') r where r not in ('renuncia','despido','fin_contrato','mutuo_acuerdo','otro'))
    and (jsonb_array_length(value->'termination_reasons')=0 or value->>'employment_stage'='cese'),false);
exception when invalid_parameter_value then return false;
end $$;

-- Freeze editable rule labels/responsibility policy as part of each version.
-- Only the new metadata column is initialized; existing historical fields stay identical.
alter table public.rule_versions add column configuration_snapshot jsonb;
create or replace function private.keep_document_history() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_table_name='rule_versions' and tg_op='UPDATE' and to_jsonb(old)->'configuration_snapshot'='null'::jsonb
    and (to_jsonb(new)-'configuration_snapshot')=(to_jsonb(old)-'configuration_snapshot')
    and jsonb_typeof(to_jsonb(new)->'configuration_snapshot')='object' then return new; end if;
  perform private.fail('FORBIDDEN'); return null;
end $$;
update public.rule_versions v set configuration_snapshot=jsonb_build_object('schema_version',1,'title',r.title,'description',r.description,
  'inherit_responsible',r.inherit_responsible,'delivery_responsible_id',r.delivery_responsible_id)
from public.requirement_rules r where r.id=v.rule_id and v.configuration_snapshot is null;
create or replace function private.keep_document_history() returns trigger language plpgsql set search_path='' as $$
begin perform private.fail('FORBIDDEN'); return null; end $$;
alter table public.rule_versions alter column configuration_snapshot set not null;
alter table public.rule_versions add constraint version_configuration_snapshot check(
  configuration_snapshot->>'schema_version'='1' and nullif(btrim(configuration_snapshot->>'title'),'') is not null
  and jsonb_typeof(configuration_snapshot->'inherit_responsible')='boolean');
create function private.h04_version_configuration() returns trigger language plpgsql set search_path='' as $$
begin
  if new.configuration_snapshot is null then
    select jsonb_build_object('schema_version',1,'title',r.title,'description',r.description,
      'inherit_responsible',r.inherit_responsible,'delivery_responsible_id',r.delivery_responsible_id)
      into new.configuration_snapshot from public.requirement_rules r where r.id=new.rule_id and r.organization_id=new.organization_id;
  end if;
  return new;
end $$;
create trigger version_configuration before insert on public.rule_versions for each row execute function private.h04_version_configuration();
alter table public.rule_versions add constraint version_conditions_valid check(private.h04_conditions_valid(applicability_conditions));
create index rule_version_effective on public.rule_versions(organization_id,rule_id,effective_from desc,version_number desc);

update public.requirement_rules r set generation_cursor=r.generation_cursor||jsonb_build_object('last_completed_end',p.end_date)
from public.periods p where p.organization_id=r.organization_id and p.kind='monthly'
  and p.period_key=r.generation_cursor->>'last_completed_occurrence';

create function private.h04_is_paused(pauses jsonb, reference_day date) returns boolean
language sql immutable set search_path='' as $$
  select exists(select 1 from jsonb_array_elements(coalesce(pauses,'[]')) p
    where (p->>'paused_from')::date<=reference_day and (p->>'resumed_on' is null or reference_day<(p->>'resumed_on')::date));
$$;
create function private.h04_resume_floor(pauses jsonb) returns date
language sql immutable set search_path='' as $$
  select max((p->>'resumed_on')::date) from jsonb_array_elements(coalesce(pauses,'[]')) p;
$$;
revoke all on function private.h04_anchor_month(date,integer), private.h04_calendar(text,date,date,integer,text,text),
  private.h04_conditions_valid(jsonb), private.h04_is_paused(jsonb,date), private.h04_resume_floor(jsonb) from public,anon,authenticated;
