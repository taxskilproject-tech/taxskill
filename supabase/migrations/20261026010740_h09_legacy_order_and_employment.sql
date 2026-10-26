create function private.h09_catalog_order(code text) returns integer language sql immutable set search_path='' as $$
 select coalesce(array_position(array['tributario_calculo','tributario_pdt','tributario_compras','tributario_ventas','tributario_control','tributario_consulta_pdt','tributario_consulta_pagos',
 'laboral_asistencia','laboral_planilla','laboral_planilla_afp','laboral_pago_afp','laboral_reporte_sis','laboral_pago_sis','laboral_reporte_essalud','laboral_pago_essalud','laboral_reporte_plame','laboral_constancia_plame',
 'ingreso_ficha','ingreso_alta','ingreso_contrato','ingreso_cv','ingreso_examen','relacion_boleta','relacion_memorandum','relacion_adenda','relacion_comunicacion','cese_liquidacion','cese_certificado','cese_pago','cese_renuncia'],code),100000);
$$;

-- Reuse recorded employment events when a worker was entered while preparation waited.
-- Event identifiers/occurred_on survive; no event is invented and no earlier recurring cycle is recovered.
alter function private.h09_activate_prepared(uuid,uuid,uuid,uuid,text) rename to h09_activate_prepared_v1;
create function private.h09_activate_prepared(org uuid,actor uuid,req uuid,company uuid,mod text) returns void
language plpgsql security definer set search_path='' as $$
declare waiting boolean; c public.companies; stage public.employment_periods; state jsonb; phase text; event jsonb;
 reference date; today date:=(now() at time zone 'America/Lima')::date; processed integer:=0;
begin
 select exists(select 1 from public.requirement_rules where organization_id=org and company_id=company and module=mod and preparation_pending and deleted_at is null) into waiting;
 perform private.h09_activate_prepared_v1(org,actor,req,company,mod);
 if not waiting or mod<>'laboral_trabajador' or exists(select 1 from public.requirement_rules where organization_id=org and company_id=company and module=mod and preparation_pending and deleted_at is null) then return; end if;
 select * into c from public.companies where organization_id=org and id=company and deleted_at is null;
 if c.id is null or c.documentary_profile is null or c.status<>'active' then return; end if;
 reference:=greatest(today,c.control_start_date);
 for stage in select e.* from public.employment_periods e join public.workers w on w.organization_id=e.organization_id and w.id=e.worker_id
  where e.organization_id=org and e.company_id=company and w.deleted_at is null and (e.end_date is null or e.end_date>=reference) order by e.id for update of e loop
  state:=stage.document_generation;
  foreach phase in array array['hire','termination'] loop
   event:=state->phase;
   if event is null or event='null'::jsonb or event->>'status'='skipped' then continue; end if;
   state:=jsonb_set(state,array[phase],event||jsonb_build_object('status','pending','reference_date',greatest(reference,(event->>'reference_date')::date),
    'requested_at',now(),'last_rule_id',null,'last_error',null));
  end loop;
  update public.employment_periods set document_generation=state where id=stage.id;
  if processed<25 then
   perform private.h05_process_employment(stage.id,actor,req,25); processed:=processed+1;
  end if;
 end loop;
end $$;
revoke all on function private.h09_catalog_order(text),private.h09_activate_prepared_v1(uuid,uuid,uuid,uuid,text),private.h09_activate_prepared(uuid,uuid,uuid,uuid,text) from public,anon,authenticated;

create or replace function private.document_workspace_query(org uuid,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; groups jsonb; c public.companies; mod text:=input->>'module'; stage text:=coalesce(input->>'employment_stage','');
begin
 result:=private.h09_workspace_legacy(org,input);
 if result->>'ok'<>'true' then return result; end if;
 select * into c from public.companies where organization_id=org and id=(input->>'company_id')::uuid;
 if not private.h09_applies(c.documentary_profile,mod,'always') then perform private.fail('FORBIDDEN'); end if;
 with configured as (
  select t.code,t.name,min(coalesce(r.presentation_order,private.h09_catalog_order(t.code))) position,min(r.created_at) first_used,
   bool_or(r.active) active,bool_or(r.preparation_pending) pending,min(r.control_start_date) starts_on
  from public.requirement_rules r join public.document_types t on t.organization_id=r.organization_id and t.id=r.document_type_id
   join public.rule_versions v on v.organization_id=r.organization_id and v.id=r.current_version_id
  where r.organization_id=org and r.company_id=c.id and r.module=mod and r.class='documentary' and r.deleted_at is null
   and (stage='' or v.applicability_conditions->>'employment_stage' in ('any',stage))
   and (r.employment_period_id is null or r.employment_period_id=(input->>'employment_period_id')::uuid)
  group by t.code,t.name
 ), combined as (
  select coalesce(a.code,b->>'code') code,coalesce(a.name,b->>'name') name,coalesce(a.position,private.h09_catalog_order(b->>'code')) position,a.first_used,a.active,a.pending,a.starts_on,
   coalesce((b->>'count')::int,0) count,coalesce((b->>'total_files')::int,0) total_files,coalesce((b->>'approved_files')::int,0) approved_files
  from configured a full join jsonb_array_elements(result->'data'->'groups') b on b->>'code'=a.code
 ) select coalesce(jsonb_agg(jsonb_build_object('code',code,'name',name,'count',count,'total_files',total_files,'approved_files',approved_files,
    'setup_state',case when pending then 'pending_responsible' when starts_on>(now() at time zone 'America/Lima')::date then 'scheduled' when active=false then 'paused' else 'active' end,
    'starts_on',starts_on) order by position nulls last,first_used nulls last,name,code),'[]') into groups from combined;
 return jsonb_set(result,'{data,groups}',groups);
end $$;

