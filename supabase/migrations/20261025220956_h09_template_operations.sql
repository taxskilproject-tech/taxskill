create function private.h09_condition(code text,mod text) returns text language sql immutable set search_path='' as $$
 select case when code in ('laboral_planilla_afp','laboral_pago_afp') then 'afp'
 when code in ('laboral_reporte_sis','laboral_pago_sis') then 'sis'
 when code in ('laboral_reporte_essalud','laboral_pago_essalud') then 'essalud'
 when mod in ('laboral_general','laboral_trabajador') then 'plame' else 'always' end;
$$;
create function private.h09_default_items(org uuid) returns jsonb language sql stable set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('document_type_id',t.id,'code',t.code,'name',t.name,'module',t.module,
  'stage',case when t.module='laboral_trabajador' then t.category else 'any' end,'condition',private.h09_condition(t.code,t.module),
  'included',true,'position',x.ord,'configuration',jsonb_build_object(
    'frequency',case when t.code in ('tributario_calculo','laboral_planilla') then 'quincenal' when t.code='tributario_control' then 'semanal'
     when t.code='laboral_asistencia' then 'diaria' when t.code in ('tributario_consulta_pdt','tributario_consulta_pagos') then null
     when t.module='laboral_trabajador' and t.code<>'relacion_boleta' then 'eventual' else 'mensual' end,
    'deadline_offset_days',null,'interval_count',null,'interval_unit',null,'anchor_date',null,
    'priority','media','is_required',true,'max_file_bytes',20000000,'allowed_formats',t.suggested_formats,
    'deliverable_specs',(select jsonb_agg(jsonb_build_object('position_code','file_'||n,'label',case when t.code='tributario_pdt' then 'PDT '||n else t.name end,
       'display_order',n,'allowed_formats',t.suggested_formats,'max_file_bytes',20000000) order by n)
       from generate_series(1,case when t.code='tributario_pdt' then 2 else 1 end) n))) order by x.ord),'[]'::jsonb)
 from unnest(array['tributario_calculo','tributario_pdt','tributario_compras','tributario_ventas','tributario_control','tributario_consulta_pdt','tributario_consulta_pagos',
 'laboral_asistencia','laboral_planilla','laboral_planilla_afp','laboral_pago_afp','laboral_reporte_sis','laboral_pago_sis','laboral_reporte_essalud','laboral_pago_essalud','laboral_reporte_plame','laboral_constancia_plame',
 'ingreso_ficha','ingreso_alta','ingreso_contrato','ingreso_cv','ingreso_examen','relacion_boleta','relacion_memorandum','relacion_adenda','relacion_comunicacion','cese_liquidacion','cese_certificado','cese_pago','cese_renuncia']) with ordinality x(code,ord)
 join public.document_types t on t.organization_id=org and t.code=x.code and t.active and t.deleted_at is null;
$$;
create function private.h09_template_issues(org uuid,items jsonb) returns jsonb language plpgsql stable set search_path='' as $$
declare item jsonb; cfg jsonb; dtype public.document_types; errors jsonb:='[]'; message text; formats text[]; codes text[]:='{}';
begin
 if items is null or jsonb_typeof(items)<>'array' or jsonb_array_length(items) not between 1 and 200 then return '[{"code":"template","message":"Incluye entre 1 y 200 entregables."}]'; end if;
 if not exists(select 1 from jsonb_array_elements(items) i where i->>'included'='true') then errors:=errors||'{"code":"template","message":"Incluye al menos un entregable."}'; end if;
 for item in select value from jsonb_array_elements(items) loop
  message:=null; cfg:=item->'configuration';
  select * into dtype from public.document_types where organization_id=org and id=(item->>'document_type_id')::uuid;
  if dtype.id is null or item->>'code' is distinct from dtype.code or item->>'module' is distinct from dtype.module or dtype.module='actividades'
    or item->>'stage' is distinct from (case when dtype.module='laboral_trabajador' then dtype.category else 'any' end)
    or (item->>'position')::int not between 1 and 1000000 or jsonb_typeof(item->'included') is distinct from 'boolean'
    or item->>'condition' is distinct from private.h09_condition(dtype.code,dtype.module) or dtype.code=any(codes) then
    message:='Tipo, módulo, etapa, condición u orden inválido o duplicado.';
  elsif item->>'included'='true' then
   select array_agg(value) into formats from jsonb_array_elements_text(cfg->'allowed_formats');
   if not dtype.active or dtype.deleted_at is not null then message:='El tipo está inhabilitado o eliminado.';
   elsif cfg->>'frequency' is null then message:='Configura la periodicidad.';
   elsif cfg->>'deadline_offset_days' is null then message:='Configura el plazo de entrega.';
   elsif (cfg->>'deadline_offset_days')::int not between -366 and 366 then message:='El plazo debe estar entre -366 y 366 días.';
   elsif cfg->>'priority' not in ('alta','media','baja') or jsonb_typeof(cfg->'is_required') is distinct from 'boolean' then message:='Configura prioridad y exigibilidad.';
   elsif not private.valid_formats(formats) or not private.valid_specs(cfg->'deliverable_specs',formats,(cfg->>'max_file_bytes')::bigint)
      or jsonb_array_length(cfg->'deliverable_specs') not between 1 and 20 or (cfg->>'max_file_bytes')::bigint not between 1 and 50000000 then message:='Revisa formatos, tamaño y archivos requeridos.';
   elsif (dtype.module='laboral_trabajador' and dtype.category in ('ingreso','cese') and cfg->>'frequency'<>'eventual')
      or (cfg->>'frequency'='unica' and (cfg->>'deadline_offset_days')::int<>0) then message:='La periodicidad no corresponde a la etapa documental.';
   else
    begin
     perform private.h04_calendar(cfg->>'frequency',(now() at time zone 'America/Lima')::date,(cfg->>'anchor_date')::date,(cfg->>'interval_count')::int,cfg->>'interval_unit','template');
    exception when others then message:='Revisa la periodicidad y sus fechas o intervalos.'; end;
   end if;
  end if;
  codes:=array_append(codes,dtype.code);
  if message is not null then errors:=errors||jsonb_build_object('code',coalesce(item->>'code','template'),'message',message); end if;
 end loop;
 return errors;
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value then
 return '[{"code":"template","message":"La configuración contiene valores inválidos."}]';
end $$;

create function private.h09_initialize(org uuid,actor uuid,req uuid) returns void language plpgsql security definer set search_path='' as $$
declare regime text; tid uuid;
begin
 insert into public.document_types(organization_id,module,code,name,category,suggested_formats,active,created_by,updated_by)
 select org,'laboral_general',v.code,v.name,'laboral_general',array['pdf'],true,actor,actor
 from (values('laboral_reporte_essalud','Reporte EsSalud'),('laboral_pago_essalud','Pago EsSalud')) v(code,name)
 on conflict(organization_id,code) do nothing;
 foreach regime in array array['nuevo_rus','rer','mype','rg','renta_4ta','renta_1ra','renta_2da','renta_5ta'] loop
  insert into public.deliverable_templates(organization_id,regime_code,created_by,updated_by) values(org,regime,actor,actor)
   on conflict(organization_id,regime_code) do nothing returning id into tid;
  if tid is not null then
   insert into public.deliverable_template_versions(organization_id,template_id,version_number,items,created_by,updated_by)
    values(org,tid,1,private.h09_default_items(org),actor,actor);
  end if;
 end loop;
end $$;

create function private.h09_template_command(org uuid,actor uuid,req uuid,op text,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare hdr public.deliverable_templates; ver public.deliverable_template_versions; result_id uuid; rev int; items jsonb;
begin
 perform private.assert_member(org,actor,true); perform private.admit_session(org);
 if op='InitializeDeliverableTemplates' then
  if input ? 'templates' then perform private.document_command(org,actor,req,'ImportDocumentCatalog',input); end if;
  perform private.h09_initialize(org,actor,req);
  return jsonb_build_object('schema_version',1,'resource_id',org,'revision',0,'status','completed');
 end if;
 select * into hdr from public.deliverable_templates where organization_id=org and id=(input->>'template_id')::uuid and deleted_at is null for update;
 if hdr.id is null then perform private.fail('NOT_FOUND'); end if;
 select * into ver from public.deliverable_template_versions where template_id=hdr.id order by version_number desc limit 1 for update;
 if ver.revision is distinct from (input->>'expected_revision')::int or ver.id is distinct from (input->>'version_id')::uuid then perform private.fail('CONFLICT'); end if;
 if op='SaveDeliverableTemplate' then
  items:=input->'items';
  if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) not between 1 and 200 then perform private.fail('VALIDATION_ERROR'); end if;
  -- Drafts may lack required business values; structural metadata must remain trusted.
  if exists(select 1 from jsonb_array_elements(items) i left join public.document_types t on t.organization_id=org and t.id=(i->>'document_type_id')::uuid
    where t.id is null or i->>'code' is distinct from t.code or i->>'module' is distinct from t.module or i->>'condition' is distinct from private.h09_condition(t.code,t.module)
     or i->>'stage' is distinct from (case when t.module='laboral_trabajador' then t.category else 'any' end)
     or jsonb_typeof(i->'included') is distinct from 'boolean' or (i->>'position')::int not between 1 and 1000000)
    or (select count(*) from jsonb_array_elements(items))<>(select count(distinct i->>'code') from jsonb_array_elements(items) i) then perform private.fail('VALIDATION_ERROR'); end if;
  if ver.published_at is not null then
   insert into public.deliverable_template_versions(organization_id,template_id,version_number,items,created_by,updated_by)
    values(org,hdr.id,ver.version_number+1,items,actor,actor) returning id,revision into result_id,rev;
  else
   update public.deliverable_template_versions set items=h09_template_command.items,revision=revision+1,updated_at=now(),updated_by=actor where id=ver.id returning id,revision into result_id,rev;
  end if;
 elsif op='PublishDeliverableTemplate' then
  if ver.published_at is not null or jsonb_array_length(private.h09_template_issues(org,ver.items))>0 then perform private.fail('VALIDATION_ERROR'); end if;
  update public.deliverable_template_versions set published_at=now(),revision=revision+1,updated_at=now(),updated_by=actor where id=ver.id returning id,revision into result_id,rev;
  update public.deliverable_templates set published_version_id=ver.id,revision=revision+1,updated_at=now(),updated_by=actor where id=hdr.id;
 else perform private.fail('VALIDATION_ERROR'); end if;
 perform private.h04_audit(org,actor,req,op,'deliverable_template_versions',result_id,null,jsonb_build_object('template_id',hdr.id,'version_id',result_id,'revision',rev));
 return jsonb_build_object('schema_version',1,'resource_id',result_id,'revision',rev,'status','completed');
end $$;

create function private.h09_templates_query(org uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform private.assert_member(org,auth.uid(),true); perform private.admit_session(org);
 return jsonb_build_object('ok',true,'data',jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(t)||jsonb_build_object(
  'latest',(select to_jsonb(v)||jsonb_build_object('issues',private.h09_template_issues(org,v.items)) from public.deliverable_template_versions v where v.template_id=t.id order by version_number desc limit 1),
  'published',(select to_jsonb(v) from public.deliverable_template_versions v where v.id=t.published_version_id)) order by t.regime_code)
  from public.deliverable_templates t where t.organization_id=org and t.deleted_at is null),'[]'::jsonb)));
end $$;

-- Populate only configuration metadata for existing studies; never modify their companies.
do $$ declare org uuid; begin
 for org in select distinct organization_id from public.document_types where deleted_at is null loop
  perform private.h09_initialize(org,null,null);
 end loop;
end $$;
revoke all on function private.h09_condition(text,text),private.h09_default_items(uuid),private.h09_template_issues(uuid,jsonb),private.h09_initialize(uuid,uuid,uuid),
 private.h09_template_command(uuid,uuid,uuid,text,jsonb),private.h09_templates_query(uuid) from public,anon,authenticated;
