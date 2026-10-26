create function private.h09_rule_start(org uuid,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.requirement_rules; v public.rule_versions; latest public.rule_versions; c public.companies; today date:=(now() at time zone 'America/Lima')::date; minimum date; period jsonb;
begin
 perform private.assert_member(org,auth.uid(),true); perform private.admit_session(org);
 if input->>'id' is not null then
  select * into r from public.requirement_rules where organization_id=org and id=(input->>'id')::uuid and deleted_at is null;
  if r.id is null then perform private.fail('NOT_FOUND'); end if;
  select * into latest from public.rule_versions where id=r.current_version_id;
  select * into v from public.rule_versions where rule_id=r.id and effective_from<=today order by effective_from desc,version_number desc limit 1;
  if v.id is null then v:=latest; end if;
  if v.frequency in ('unica','eventual') then minimum:=today+1;
  else period:=private.h04_calendar(v.frequency,today,v.anchor_date,v.interval_count,v.interval_unit,r.id::text); minimum:=(period->>'end_date')::date+1; end if;
  minimum:=greatest(minimum,latest.effective_from);
 else
  select * into c from public.companies where organization_id=org and id=(input->>'company_id')::uuid and deleted_at is null;
  if c.id is null then perform private.fail('NOT_FOUND'); end if;
  minimum:=greatest(today,c.control_start_date);
 end if;
 return jsonb_build_object('ok',true,'data',jsonb_build_object('minimum',minimum,'frequency',v.frequency,'today',today));
end $$;
alter function private.h08_document_query(uuid,text,jsonb) rename to h09_document_query_v1;
create function private.h08_document_query(p_organization_id uuid,p_resource text,p_input jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if p_resource='rule_start' then return private.h09_rule_start(p_organization_id,p_input); end if;
 return private.h09_document_query_v1(p_organization_id,p_resource,p_input);
end $$;
revoke all on function private.h09_rule_start(uuid,jsonb),private.h09_document_query_v1(uuid,text,jsonb),private.h08_document_query(uuid,text,jsonb) from public,anon,authenticated;

create or replace function private.save_company(org uuid,actor uuid,req uuid,input jsonb) returns jsonb
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
 original_status:=coalesce(input->>'status',old.status,'active');
 changed:=old.id is null or old.documentary_profile is distinct from profile or old.tax_regime_code is distinct from regime;
 if not changed and old.id is not null then version:=old.document_template_version_id; end if;
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
 update public.companies set tax_regime_code=regime,documentary_profile=profile,document_template_version_id=version,status=case when changed then 'active' else status end where id=cid and organization_id=org;
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
 if changed then update public.companies set status=original_status where id=cid; end if;
 foreach mod in array array['tributario','laboral_general','laboral_trabajador'] loop
  perform private.h09_activate_prepared(org,actor,req,cid,mod);
 end loop;
 perform private.h04_audit(org,actor,req,'PrepareCompanyDeliverables','companies',cid,
   jsonb_build_object('regime_code',old.tax_regime_code,'profile',old.documentary_profile),jsonb_build_object('regime_code',regime,'profile',profile,'template_version_id',version));
 return result;
end $$;
