create or replace function private.h09_activate_prepared(org uuid,actor uuid,req uuid,company uuid,mod text) returns void
language plpgsql security definer set search_path='' as $$
declare r public.requirement_rules; c public.companies; responsible uuid; today date:=(now() at time zone 'America/Lima')::date;
begin
 select * into c from public.companies where organization_id=org and id=company and deleted_at is null;
 select delivery_responsible_id into responsible from public.company_module_settings where organization_id=org and company_id=company and module=mod and deleted_at is null;
 if c.id is null or c.status<>'active' or responsible is null or not private.has_permission(org,responsible,company,mod,'upload') then return; end if;
 for r in select * from public.requirement_rules where organization_id=org and company_id=company and module=mod and preparation_pending and deleted_at is null for update loop
  if not private.h09_applies(c.documentary_profile,mod,r.applicability_key) then continue; end if;
  -- The initial wait is not a technical outage: begin at the occurrence containing activation.
  update public.requirement_rules set control_start_date=greatest(control_start_date,c.control_start_date,today),generation_cursor='{"schema_version":1,"rule_version_id":null,"last_completed_occurrence":null,"processing_occurrence":null,"next_destination_key":null,"last_generated_at":null}'::jsonb where id=r.id;
  perform private.document_command(org,actor,req,'SetRuleActive',jsonb_build_object('rule_id',r.id,'expected_revision',r.revision,'active',true));
  update public.requirement_rules set preparation_pending=false where id=r.id;
  perform private.h04_generate(r.id,actor,req,today,25,null);
 end loop;
end $$;
