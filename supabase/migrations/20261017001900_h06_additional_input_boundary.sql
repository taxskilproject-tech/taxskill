create function private.h06_assert_delivery(p_org uuid,p_user uuid,p_company uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if p_user is null or not private.h06_visible(p_org,p_user,p_company,'actividades')
    or not private.has_permission(p_org,p_user,p_company,'actividades','upload') then perform private.fail('VALIDATION_ERROR'); end if;
end $$;
revoke all on function private.h06_assert_delivery(uuid,uuid,uuid) from public,anon,authenticated;

alter function private.h06_create_additional(uuid,uuid,uuid,jsonb) rename to h06_create_additional_core;
create function private.h06_create_additional(p_org uuid,p_actor uuid,p_request uuid,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  perform private.assert_member(p_org,p_actor,true);
  perform private.h06_assert_delivery(p_org,(p_input->>'delivery_responsible_id')::uuid,(p_input->>'company_id')::uuid);
  if not coalesce(length(btrim(p_input->>'title')) between 2 and 150,false)
    or length(coalesce(p_input->>'description',''))>1000
    or jsonb_typeof(p_input->'deliverable_specs') is distinct from 'array'
    or jsonb_array_length(p_input->'deliverable_specs') not between 1 and 20
    or jsonb_typeof(p_input->'allowed_formats') is distinct from 'array'
    or not coalesce((p_input->>'max_file_bytes')::bigint between 1 and 50000000,false)
    or coalesce(p_input->>'priority','media') not in ('alta','media','baja') then perform private.fail('VALIDATION_ERROR'); end if;
  return private.h06_create_additional_core(p_org,p_actor,p_request,p_input||'{"is_required":true,"inherit_responsible":false,"module":"actividades"}'::jsonb);
end $$;
revoke all on function private.h06_create_additional_core(uuid,uuid,uuid,jsonb),private.h06_create_additional(uuid,uuid,uuid,jsonb) from public,anon,authenticated;

alter function private.document_command(uuid,uuid,uuid,text,jsonb) rename to document_command_h06_admin;
create function private.document_command(org uuid,actor uuid,req uuid,op text,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_obligation public.obligations; v_rule public.requirement_rules;
begin
  if op='ConfigureAdditionalRequirement' then
    perform private.assert_member(org,actor,true);
    perform private.h06_assert_delivery(org,(input->>'delivery_responsible_id')::uuid,(input->>'company_id')::uuid);
    input:=input||'{"is_required":true,"inherit_responsible":false}'::jsonb;
  elsif op='ReassignDelivery' then
    select * into v_obligation from public.obligations where organization_id=org and id=(input->>'obligation_id')::uuid and class='additional';
    if v_obligation.id is not null then
      perform private.assert_member(org,actor,true);
      perform private.h06_assert_delivery(org,(input->>'delivery_responsible_id')::uuid,v_obligation.company_id);
    end if;
  elsif op='RestoreDocumentEntity' and input->>'entity'='requirement_rules' then
    select * into v_rule from public.requirement_rules where organization_id=org and id=(input->>'id')::uuid and class='additional';
    if v_rule.id is not null then
      perform private.assert_member(org,actor,true);
      perform private.h06_assert_delivery(org,v_rule.delivery_responsible_id,v_rule.company_id);
    end if;
  end if;
  return private.document_command_h06_admin(org,actor,req,op,input);
end $$;
revoke all on function private.document_command_h06_admin(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
