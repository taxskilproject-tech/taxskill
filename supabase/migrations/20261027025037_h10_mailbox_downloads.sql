create function public.h10_download_authorize(p_organization_id uuid,p_actor_id uuid,p_session_id uuid,p_attachment_id uuid,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare file public.sunat_attachments;
begin
 perform private.h10_service_actor(p_organization_id,p_actor_id,p_session_id,false);
 select * into file from public.sunat_attachments where organization_id=p_organization_id and id=p_attachment_id;
 if file.id is null then perform private.fail('NOT_FOUND'); end if;
 if not private.h10_allowed(p_organization_id,file.company_id,p_actor_id) then perform private.fail('FORBIDDEN'); end if;
 if file.state<>'cached' then perform private.fail('CONFLICT'); end if;
 perform private.h10_audit(p_organization_id,p_actor_id,file.company_id,p_request_id,'sunat.download.prepared','sunat_attachments',file.id,
  jsonb_build_object('attachment_id',file.id,'ttl_seconds',60));
 return jsonb_build_object('ok',true,'data',jsonb_build_object('object_name',file.object_name,'filename',file.filename,'byte_size',file.byte_size,'mime_type',file.mime_type));
exception when raise_exception then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',sqlerrm));
end $$;
revoke all on function public.h10_download_authorize(uuid,uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.h10_download_authorize(uuid,uuid,uuid,uuid,uuid) to service_role;
notify pgrst,'reload schema';
