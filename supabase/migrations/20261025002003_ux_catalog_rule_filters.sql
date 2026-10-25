-- Optional filters are evaluated over the authorized universe before pagination.
-- Preserve H08 session admission and the public upload-token sanitization wrapper.
alter function private.h08_document_query(uuid,text,jsonb) rename to ux_document_query_legacy;
revoke all on function private.ux_document_query_legacy(uuid,text,jsonb) from public,anon,authenticated;

create function private.h08_document_query(p_organization_id uuid,p_resource text,p_input jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_result jsonb;
  v_page integer:=greatest(coalesce((p_input->>'page')::integer,1),1);
  v_query text:=lower(trim(coalesce(p_input->>'q','')));
  v_module text:=nullif(p_input->>'module','');
  v_active boolean:=(p_input->>'active')::boolean;
  v_deleted boolean:=coalesce((p_input->>'include_deleted')::boolean,false);
  v_start integer;
begin
  if p_resource not in ('catalog','rules') then
    return private.ux_document_query_legacy(p_organization_id,p_resource,p_input);
  end if;
  perform private.assert_member(p_organization_id,auth.uid(),true);
  perform private.admit_session(p_organization_id);
  if length(v_query)>200 or v_page>1000000 or
    (v_module is not null and v_module not in ('tributario','laboral_trabajador','laboral_general','actividades')) or
    (p_input ? 'active' and jsonb_typeof(p_input->'active') not in ('boolean','null')) then
    perform private.fail('VALIDATION_ERROR');
  end if;
  v_start:=(v_page-1)*25;
  if p_resource='catalog' then
    with visible as (
      select d.* from public.document_types d
      where d.organization_id=p_organization_id and (v_deleted or d.deleted_at is null)
        and (v_module is null or d.module=v_module)
        and (v_active is null or d.active=v_active)
        and (v_query='' or strpos(lower(d.name||' '||d.code),v_query)>0)
    ) select jsonb_build_object(
      'rows',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from visible order by name,id offset v_start limit 25) x),'[]'::jsonb),
      'count',(select count(*) from visible)) into v_result;
  else
    with visible as (
      select r.*,c.legal_name company_name,to_jsonb(v) configuration,
        (select to_jsonb(a) from public.rule_versions a where a.organization_id=r.organization_id and a.rule_id=r.id
          and a.effective_from<=(now() at time zone 'America/Lima')::date order by a.effective_from desc,a.version_number desc limit 1) effective_configuration
      from public.requirement_rules r
      join public.companies c on c.id=r.company_id and c.organization_id=r.organization_id
      left join public.rule_versions v on v.id=r.current_version_id
      where r.organization_id=p_organization_id and (v_deleted or (r.deleted_at is null and c.deleted_at is null))
        and (p_input->>'company_id' is null or r.company_id=(p_input->>'company_id')::uuid)
        and (v_module is null or r.module=v_module)
        and (v_active is null or r.active=v_active)
        and (v_query='' or strpos(lower(r.title||' '||c.legal_name),v_query)>0)
    ) select jsonb_build_object(
      'rows',coalesce((select jsonb_agg(to_jsonb(x)) from (select * from visible order by created_at desc,id offset v_start limit 25) x),'[]'::jsonb),
      'count',(select count(*) from visible)) into v_result;
  end if;
  return jsonb_build_object('ok',true,'data',v_result);
exception
  when raise_exception then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',sqlerrm));
  when invalid_text_representation or numeric_value_out_of_range then
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR'));
end $$;
revoke all on function private.h08_document_query(uuid,text,jsonb) from public,anon,authenticated;
