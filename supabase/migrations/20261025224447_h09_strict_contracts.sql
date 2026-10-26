-- Fail closed on missing JSON fields; SQL NULL must never validate a publication.
create function private.h09_item_shape(item jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare cfg jsonb:=item->'configuration'; formats text[];
begin
 if jsonb_typeof(item) is distinct from 'object' or not item ?& array['document_type_id','code','name','module','stage','condition','included','position','configuration']
  or jsonb_typeof(cfg) is distinct from 'object' or not cfg ?& array['frequency','deadline_offset_days','interval_count','interval_unit','anchor_date','priority','is_required','max_file_bytes','allowed_formats','deliverable_specs'] then return false; end if;
 if (item->>'document_type_id')::uuid is null or nullif(btrim(item->>'name'),'') is null or length(item->>'name')>200
  or jsonb_typeof(item->'included') is distinct from 'boolean' or jsonb_typeof(item->'position') is distinct from 'number'
  or (item->>'position')::int not between 1 and 1000000 or cfg->>'priority' is null or cfg->>'priority' not in ('alta','media','baja')
  or jsonb_typeof(cfg->'is_required') is distinct from 'boolean' or jsonb_typeof(cfg->'max_file_bytes') is distinct from 'number'
  or (cfg->>'max_file_bytes')::bigint not between 1 and 50000000
  or jsonb_typeof(cfg->'allowed_formats') is distinct from 'array' or jsonb_typeof(cfg->'deliverable_specs') is distinct from 'array' then return false; end if;
 select array_agg(value) into formats from jsonb_array_elements_text(cfg->'allowed_formats');
 if not coalesce(private.valid_formats(formats),false)
  or not coalesce(private.valid_specs(cfg->'deliverable_specs',formats,(cfg->>'max_file_bytes')::bigint),false)
  or jsonb_array_length(cfg->'deliverable_specs') not between 1 and 20 then return false; end if;
 if cfg->'frequency'<>'null'::jsonb and (cfg->>'frequency' is null or cfg->>'frequency' not in ('unica','diaria','semanal','quincenal','mensual','trimestral','semestral','anual','eventual','personalizada')) then return false; end if;
 if cfg->'deadline_offset_days'<>'null'::jsonb and (jsonb_typeof(cfg->'deadline_offset_days')<>'number' or (cfg->>'deadline_offset_days')::int not between -366 and 366) then return false; end if;
 return true;
exception when invalid_text_representation or numeric_value_out_of_range or invalid_parameter_value then return false;
end $$;
alter function private.h09_template_issues(uuid,jsonb) rename to h09_template_issues_v1;
create function private.h09_template_issues(org uuid,items jsonb) returns jsonb
language plpgsql stable set search_path='' as $$
begin
 if jsonb_typeof(items) is distinct from 'array' then return '[{"code":"template","message":"La lista de entregables es inválida."}]'; end if;
 if exists(select 1 from jsonb_array_elements(items) i where not private.h09_item_shape(i)) then
  return '[{"code":"template","message":"Completa los campos y archivos requeridos de la configuración."}]'; end if;
 return private.h09_template_issues_v1(org,items);
end $$;
alter function private.h09_template_command(uuid,uuid,uuid,text,jsonb) rename to h09_template_command_v1;
create function private.h09_template_command(org uuid,actor uuid,req uuid,op text,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform private.assert_member(org,actor,true); perform private.admit_session(org);
 if op='SaveDeliverableTemplate' then
  if jsonb_typeof(input->'items') is distinct from 'array' then perform private.fail('VALIDATION_ERROR'); end if;
  if exists(select 1 from jsonb_array_elements(input->'items') i where not private.h09_item_shape(i)) then perform private.fail('VALIDATION_ERROR'); end if;
 end if;
 return private.h09_template_command_v1(org,actor,req,op,input);
end $$;
create or replace function private.h09_profile_valid(profile jsonb) returns boolean language sql immutable set search_path='' as $$
 select coalesce(jsonb_typeof(profile)='object' and profile->'schema_version'='1'::jsonb
  and profile ?& array['schema_version','plame','afp','igv_renta','health_coverage']
  and not exists(select 1 from jsonb_object_keys(profile) k where k not in ('schema_version','plame','afp','igv_renta','health_coverage'))
  and jsonb_typeof(profile->'plame')='boolean' and jsonb_typeof(profile->'afp')='boolean' and jsonb_typeof(profile->'igv_renta')='boolean'
  and profile->>'health_coverage' in ('none','sis','essalud')
  and ((profile->>'plame')::boolean or (profile->>'igv_renta')::boolean)
  and (not (profile->>'afp')::boolean or (profile->>'plame')::boolean)
  and ((profile->>'plame')::boolean or profile->>'health_coverage'='none'),false);
$$;
-- A successful explicit activation/pause is no longer an initial preparation.
alter function private.document_command(uuid,uuid,uuid,text,jsonb) rename to h09_document_command_v1;
create function private.document_command(org uuid,actor uuid,req uuid,op text,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 result:=private.h09_document_command_v1(org,actor,req,op,input);
 if op='SetRuleActive' then update public.requirement_rules set preparation_pending=false where organization_id=org and id=(input->>'rule_id')::uuid; end if;
 return result;
end $$;
revoke all on function private.h09_item_shape(jsonb),private.h09_template_issues_v1(uuid,jsonb),private.h09_template_issues(uuid,jsonb),
 private.h09_template_command_v1(uuid,uuid,uuid,text,jsonb),private.h09_template_command(uuid,uuid,uuid,text,jsonb),
 private.h09_document_command_v1(uuid,uuid,uuid,text,jsonb),private.document_command(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
