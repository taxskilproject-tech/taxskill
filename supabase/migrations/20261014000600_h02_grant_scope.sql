create or replace function private.assign_access(org uuid, actor uuid, req uuid, input jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
<<body>>
declare result jsonb; grant_id uuid; item jsonb; relation public.grant_permission_overrides;
begin
  if input ? 'overrides' and jsonb_typeof(input->'overrides')<>'array' then perform private.fail('VALIDATION_ERROR'); end if;
  result := private.persist(org,actor,req,'access_grants',input,array['member_id','scope','company_id','module','role_id','active']);
  grant_id := (result->>'resource_id')::uuid;
  for relation in select * from public.grant_permission_overrides ov where ov.organization_id=org and ov.grant_id=body.grant_id and ov.deleted_at is null loop
    perform private.change_lifecycle(org,actor,req,jsonb_build_object('entity','grant_permission_overrides','id',relation.id,'expected_revision',relation.revision,'reason','Sustitución explícita de overrides'),false);
  end loop;
  for item in select value from jsonb_array_elements(coalesce(input->'overrides','[]')) loop
    select * into relation from public.grant_permission_overrides ov where ov.organization_id=org and ov.grant_id=body.grant_id and ov.permission_id=(item->>'permission_id')::uuid;
    perform private.persist(org,actor,req,'grant_permission_overrides',item || jsonb_build_object('grant_id',grant_id) ||
      case when relation.id is null then '{}'::jsonb else jsonb_build_object('id',relation.id,'expected_revision',relation.revision,'deleted_at',null,'deleted_by',null,'deletion_reason',null) end,
      array['grant_id','permission_id','allowed','deleted_at','deleted_by','deletion_reason']);
  end loop;
  return result;
end $$;
