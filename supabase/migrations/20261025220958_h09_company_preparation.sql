create function private.h09_copy_template(org uuid,actor uuid,req uuid,company uuid,version uuid,profile jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare item jsonb; cfg jsonb; result jsonb; conditions jsonb; rid uuid; position integer;
begin
 select coalesce(max(presentation_order),0) into position from public.requirement_rules where organization_id=org and company_id=company;
 for item in select value from public.deliverable_template_versions v,jsonb_array_elements(v.items) where v.organization_id=org and v.id=version order by (value->>'position')::int,value->>'code' loop
  if item->>'included'<>'true' or not private.h09_applies(profile,item->>'module',item->>'condition') then continue; end if;
  if exists(select 1 from public.requirement_rules where organization_id=org and company_id=company and document_type_id=(item->>'document_type_id')::uuid and deleted_at is null) then continue; end if;
  cfg:=item->'configuration'; position:=position+1;
  conditions:=jsonb_build_object('schema_version',1,'employment_stage',item->>'stage',
   'event_types',case when cfg->>'frequency'<>'eventual' then '[]'::jsonb when item->>'stage'='ingreso' then '["worker_hired"]'::jsonb
     when item->>'stage'='cese' then '["worker_terminated"]'::jsonb else '["manual_request"]'::jsonb end,
   'termination_reasons',case when item->>'code'='cese_renuncia' then '["renuncia"]'::jsonb else '[]'::jsonb end);
  result:=private.h04_configure(org,actor,req,cfg||jsonb_build_object('company_id',company,'document_type_id',item->>'document_type_id',
    'title',item->>'name','description',null,'active',false,'inherit_responsible',true,'delivery_responsible_id',null,'applicability_conditions',conditions));
  rid:=(result->>'resource_id')::uuid;
  update public.requirement_rules set preparation_pending=true,template_version_id=version,presentation_order=position,applicability_key=item->>'condition' where id=rid;
 end loop;
end $$;

create function private.h09_activate_prepared(org uuid,actor uuid,req uuid,company uuid,mod text) returns void
language plpgsql security definer set search_path='' as $$
declare r public.requirement_rules; c public.companies; responsible uuid; today date:=(now() at time zone 'America/Lima')::date;
begin
 select * into c from public.companies where organization_id=org and id=company and deleted_at is null;
 select delivery_responsible_id into responsible from public.company_module_settings where organization_id=org and company_id=company and module=mod and deleted_at is null;
 if c.id is null or c.status<>'active' or responsible is null or not private.has_permission(org,responsible,company,mod,'upload') then return; end if;
 for r in select * from public.requirement_rules where organization_id=org and company_id=company and module=mod and preparation_pending and deleted_at is null for update loop
  if not private.h09_applies(c.documentary_profile,mod,r.applicability_key) then continue; end if;
  -- The initial wait is not a technical outage: begin at the occurrence containing activation.
  update public.requirement_rules set control_start_date=greatest(control_start_date,c.control_start_date,today),generation_cursor=null where id=r.id;
  perform private.document_command(org,actor,req,'SetRuleActive',jsonb_build_object('rule_id',r.id,'expected_revision',r.revision,'active',true));
  update public.requirement_rules set preparation_pending=false where id=r.id;
  perform private.h04_generate(r.id,actor,req,today,25,null);
 end loop;
end $$;

alter function private.save_company(uuid,uuid,uuid,jsonb) rename to h09_save_company_legacy;
create function private.save_company(org uuid,actor uuid,req uuid,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare old public.companies; hdr public.deliverable_templates; ver public.deliverable_template_versions; result jsonb; cid uuid;
 profile jsonb:=input->'documentary_profile'; regime text:=input->>'tax_regime_code'; version uuid:=(input->>'document_template_version_id')::uuid;
 r public.requirement_rules; mod text; original_status text:=coalesce(input->>'status','active'); changed boolean;
begin
 if input ? 'id' then select * into old from public.companies where organization_id=org and id=(input->>'id')::uuid for update; end if;
 -- Existing fixture/legacy rows are not silently converted or backfilled.
 if old.id is not null and old.documentary_profile is null and profile is null then return private.h09_save_company_legacy(org,actor,req,input); end if;
 if profile is null and old.id is not null then profile:=old.documentary_profile; regime:=old.tax_regime_code; version:=old.document_template_version_id; end if;
 if not private.h09_profile_valid(profile) or regime is null then perform private.fail('VALIDATION_ERROR'); end if;
 changed:=old.id is null or old.documentary_profile is distinct from profile or old.tax_regime_code is distinct from regime;
 if changed then
  select * into hdr from public.deliverable_templates where organization_id=org and regime_code=regime and deleted_at is null for update;
  if hdr.id is null or hdr.published_version_id is null then perform private.fail('VALIDATION_ERROR'); end if;
  if hdr.published_version_id is distinct from version then perform private.fail('CONFLICT'); end if;
  select * into ver from public.deliverable_template_versions where organization_id=org and template_id=hdr.id and id=version and published_at is not null;
  if ver.id is null or jsonb_array_length(private.h09_template_issues(org,ver.items))>0 then perform private.fail('VALIDATION_ERROR'); end if;
  if old.id is not null and not coalesce((input->>'confirm_document_changes')::boolean,false) then perform private.fail('CONFLICT'); end if;
 end if;
 result:=private.h09_save_company_legacy(org,actor,req,case when old.id is null then input||'{"status":"active"}'::jsonb else input end);
 cid:=(result->>'resource_id')::uuid;
 update public.companies set tax_regime_code=regime,documentary_profile=profile,document_template_version_id=version where id=cid and organization_id=org;
 if changed then
  for r in select * from public.requirement_rules where organization_id=org and company_id=cid and deleted_at is null for update loop
   if not private.h09_applies(profile,r.module,r.applicability_key) or (r.template_version_id is not null and not exists(
    select 1 from jsonb_array_elements(ver.items) i where i->>'document_type_id'=r.document_type_id::text and i->>'included'='true')) then
    update public.requirement_rules set active=false,preparation_pending=false,revision=revision+1,updated_at=now(),updated_by=actor,
      operation_pauses=private.pause_intervals(operation_pauses,true,'profile_change','Cambio de perfil documental confirmado',actor) where id=r.id;
   end if;
  end loop;
  -- Copy only missing types; existing compatible company-specific settings remain unchanged.
  perform private.h09_copy_template(org,actor,req,cid,version,profile);
 end if;
 if old.id is null then update public.companies set status=original_status where id=cid; end if;
 foreach mod in array array['tributario','laboral_general','laboral_trabajador'] loop
  perform private.h09_activate_prepared(org,actor,req,cid,mod);
 end loop;
 perform private.h04_audit(org,actor,req,'PrepareCompanyDeliverables','companies',cid,
   jsonb_build_object('regime_code',old.tax_regime_code,'profile',old.documentary_profile),jsonb_build_object('regime_code',regime,'profile',profile,'template_version_id',version));
 return result;
end $$;

alter function private.command(uuid,uuid,uuid,text,jsonb) rename to h09_command_legacy;
create function private.command(org uuid,actor uuid,req uuid,op text,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if op in ('InitializeDeliverableTemplates','SaveDeliverableTemplate','PublishDeliverableTemplate') then return private.h09_template_command(org,actor,req,op,input); end if;
 result:=private.h09_command_legacy(org,actor,req,op,input);
 if op='SaveModuleSettings' then perform private.h09_activate_prepared(org,actor,req,(input->>'company_id')::uuid,input->>'module'); end if;
 return result;
end $$;

-- Guard manual additions/activation against the company's selected modules and coverage.
alter function private.h04_configure(uuid,uuid,uuid,jsonb) rename to h09_configure_legacy;
create function private.h04_configure(org uuid,actor uuid,req uuid,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.companies; t public.document_types; result jsonb; rid uuid; ord int; start_day date;
begin
 select * into c from public.companies where organization_id=org and id=(input->>'company_id')::uuid;
 select * into t from public.document_types where organization_id=org and id=(input->>'document_type_id')::uuid;
 if c.documentary_profile is not null and t.id is not null and not private.h09_applies(c.documentary_profile,t.module,private.h09_condition(t.code,t.module)) then perform private.fail('VALIDATION_ERROR'); end if;
 if not(input ? 'id') and input ? 'control_start_date' then
  start_day:=(input->>'control_start_date')::date;
  if start_day is null or start_day<greatest(c.control_start_date,(now() at time zone 'America/Lima')::date) then perform private.fail('VALIDATION_ERROR'); end if;
 end if;
 result:=private.h09_configure_legacy(org,actor,req,input); rid:=(result->>'resource_id')::uuid;
 if not(input ? 'id') and t.id is not null then
  perform 1 from public.companies where id=c.id for update;
  select coalesce(min(presentation_order),(select coalesce(max(presentation_order),0)+1 from public.requirement_rules where company_id=c.id and organization_id=org)) into ord
   from public.requirement_rules where organization_id=org and company_id=c.id and document_type_id=t.id and id<>rid;
  update public.requirement_rules set presentation_order=ord,applicability_key=private.h09_condition(t.code,t.module) where id=rid;
 end if;
 return result;
end $$;

alter function private.document_command(uuid,uuid,uuid,text,jsonb) rename to h09_document_command_legacy;
create function private.document_command(org uuid,actor uuid,req uuid,op text,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.requirement_rules; c public.companies;
begin
 if op='SetRuleActive' then
  select * into r from public.requirement_rules where organization_id=org and id=(input->>'rule_id')::uuid;
  select * into c from public.companies where organization_id=org and id=r.company_id;
  if (input->>'active')::boolean and not private.h09_applies(c.documentary_profile,r.module,r.applicability_key) then perform private.fail('VALIDATION_ERROR'); end if;
  -- A deliberate pause is never reactivated by a later responsible assignment.
  if not(input->>'active')::boolean then update public.requirement_rules set preparation_pending=false where id=r.id; end if;
 end if;
 return private.h09_document_command_legacy(org,actor,req,op,input);
end $$;
revoke all on function private.h09_copy_template(uuid,uuid,uuid,uuid,uuid,jsonb),private.h09_activate_prepared(uuid,uuid,uuid,uuid,text),private.h09_save_company_legacy(uuid,uuid,uuid,jsonb),
 private.save_company(uuid,uuid,uuid,jsonb),private.h09_command_legacy(uuid,uuid,uuid,text,jsonb),private.command(uuid,uuid,uuid,text,jsonb),
 private.h09_configure_legacy(uuid,uuid,uuid,jsonb),private.h04_configure(uuid,uuid,uuid,jsonb),private.h09_document_command_legacy(uuid,uuid,uuid,text,jsonb),private.document_command(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
