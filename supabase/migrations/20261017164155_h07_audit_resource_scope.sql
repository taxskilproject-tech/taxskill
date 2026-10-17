-- Resolve historical resource parents without rewriting immutable audit events.
create view private.h07_audit_scoped as
select a.*,
  coalesce(a.company_id,
    case when a.resource_table='companies' then a.resource_id end,
    o.company_id, ep.company_id, w.company_id, r.company_id, g.company_id, cm.company_id) effective_company,
  coalesce(a.module, o.module,
    case when a.resource_table in ('workers','employment_periods') then 'laboral_trabajador' end,
    r.module, dt.module, g.module, cm.module) effective_module
from public.audit_events a
left join public.document_versions v
  on a.resource_table='document_versions' and v.id=a.resource_id and v.organization_id=a.organization_id
left join public.review_events rv
  on a.resource_table='review_events' and rv.id=a.resource_id and rv.organization_id=a.organization_id
left join public.submission_cycles sc
  on a.resource_table='submission_cycles' and sc.id=a.resource_id and sc.organization_id=a.organization_id
left join public.upload_intents ui
  on a.resource_table='upload_intents' and ui.id=a.resource_id and ui.organization_id=a.organization_id
left join public.deliverables d
  on d.id=case when a.resource_table='deliverables' then a.resource_id
    else coalesce(v.deliverable_id,rv.deliverable_id,sc.deliverable_id,ui.deliverable_id) end
  and d.organization_id=a.organization_id
left join public.obligations o
  on o.id=case when a.resource_table='obligations' then a.resource_id else d.obligation_id end
  and o.organization_id=a.organization_id
left join public.employment_periods ep
  on a.resource_table='employment_periods' and ep.id=a.resource_id and ep.organization_id=a.organization_id
left join public.workers w
  on a.resource_table='workers' and w.id=a.resource_id and w.organization_id=a.organization_id
left join public.rule_versions vr
  on a.resource_table='rule_versions' and vr.id=a.resource_id and vr.organization_id=a.organization_id
left join public.requirement_rules r
  on r.id=case when a.resource_table='requirement_rules' then a.resource_id else vr.rule_id end
  and r.organization_id=a.organization_id
left join public.document_types dt
  on a.resource_table='document_types' and dt.id=a.resource_id and dt.organization_id=a.organization_id
left join public.grant_permission_overrides go
  on a.resource_table='grant_permission_overrides' and go.id=a.resource_id and go.organization_id=a.organization_id
left join public.access_grants g
  on g.id=case when a.resource_table='access_grants' then a.resource_id else go.grant_id end
  and g.organization_id=a.organization_id
left join public.company_module_settings cm
  on a.resource_table='company_module_settings' and cm.id=a.resource_id and cm.organization_id=a.organization_id;

revoke all on private.h07_audit_scoped from public,anon,authenticated;

do $$
declare source text; previous text; replacement text;
begin
  select pg_get_functiondef('private.h07_audit(uuid,uuid,jsonb)'::regprocedure) into source;
  previous:=$old$with scoped as(select a.*,coalesce(a.company_id,case when a.resource_table='companies' then a.resource_id end,o.company_id) effective_company,
    coalesce(a.module,o.module) effective_module from public.audit_events a
    left join public.obligations o on o.id=a.resource_id and a.resource_table='obligations' and o.organization_id=a.organization_id where a.organization_id=p_org),$old$;
  replacement:='with scoped as(select * from private.h07_audit_scoped where organization_id=p_org),';
  if position(previous in source)=0 then
    raise exception 'H07 audit scope definition differs from the expected migration baseline';
  end if;
  execute replace(source,previous,replacement);
end $$;
