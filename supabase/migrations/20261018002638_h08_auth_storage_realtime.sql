alter function public.h02_context() set schema private;
alter function private.h02_context() rename to h08_context_base;
create function public.h02_context() returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_result jsonb; v_org uuid;
begin
  v_result:=private.h08_context_base();
  if not coalesce((v_result->>'ok')::boolean,false) then return v_result; end if;
  v_org:=(v_result->'data'->'organization'->>'id')::uuid;
  if not private.h08_member(v_org) then perform private.fail('FORBIDDEN'); end if;
  v_result:=jsonb_set(v_result,'{data,session_id}',to_jsonb(private.h08_session_id()));
  v_result:=jsonb_set(v_result,'{data,companies}',coalesce((select jsonb_agg(c) from jsonb_array_elements(v_result->'data'->'companies') c
    where private.h08_company(v_org,(c->>'id')::uuid)),'[]'::jsonb));
  v_result:=jsonb_set(v_result,'{data,capabilities}',coalesce((select jsonb_agg(c) from jsonb_array_elements(v_result->'data'->'capabilities') c
    where private.h08_scope(v_org,(c->>'company_id')::uuid,c->>'module',c->>'action')),'[]'::jsonb));
  return v_result;
exception when raise_exception then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',sqlerrm));
end $$;

-- Private channels are addressed to a specific, currently admitted Auth session.
create or replace function private.h06_broadcast_notice() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_session public.app_sessions;
begin
  for v_session in select a.* from public.app_sessions a join auth.sessions s on s.id=a.session_id and s.user_id=a.user_id
    join public.organization_members m on m.organization_id=a.organization_id and m.user_id=a.user_id
    join public.profiles p on p.user_id=a.user_id
    where a.organization_id=new.organization_id and a.user_id=new.recipient_id and a.revoked_at is null
      and (s.not_after is null or s.not_after>now()) and m.active and m.deleted_at is null and p.enabled and p.deleted_at is null loop
    perform realtime.send('{"changed":true}'::jsonb,'changed',
      'personal-notices:'||new.organization_id||':'||new.recipient_id||':'||v_session.session_id,true);
  end loop;
  return new;
end $$;
create function private.h08_channel(p_topic text) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.app_sessions a where a.user_id=auth.uid()
    and a.session_id=private.h08_session_id() and private.h08_member(a.organization_id)
    and p_topic='personal-notices:'||a.organization_id||':'||a.user_id||':'||a.session_id);
$$;
create policy h08_personal_broadcast on realtime.messages for select to authenticated
  using(extension='broadcast' and private.h08_channel(realtime.topic()));
-- Never permit publishing fabricated notice markers, including through other permissive policies.
create policy h08_no_client_broadcast on realtime.messages as restrictive for insert to anon,authenticated with check(false);

-- Browser uploads use the existing Edge-authorized signed TUS reservation. Raw storage access is denied.
update storage.buckets set public=false where id in ('document-reception','documents');
create policy h08_private_documents on storage.objects as restrictive for all to anon,authenticated
  using(bucket_id not in ('document-reception','documents'))
  with check(bucket_id not in ('document-reception','documents'));
-- A permissive SELECT policy would let callers mint arbitrary long signed URLs and bypass download audit/TTL.
-- Download remains the existing, audited Edge operation, signing confirmed versions for 60 seconds.

revoke all on all functions in schema public from public,anon,authenticated;
revoke all on all functions in schema private from public,anon,authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public,anon,authenticated;
alter default privileges for role postgres in schema private revoke execute on functions from public,anon,authenticated;
grant execute on function public.h02_context(),public.h02_command(uuid,uuid,text,jsonb),public.h02_operation_status(uuid),
  public.h03_query(uuid,text,jsonb),public.h03_command(uuid,uuid,text,jsonb),public.h03_upload_context(uuid),
  public.h04_preview(uuid,jsonb),public.h05_query(uuid,text,jsonb),public.h06_query(uuid,text,jsonb),
  public.h07_query(uuid,text,jsonb),public.h07_export(uuid,uuid,text,jsonb) to authenticated;
grant execute on function private.h08_admin(uuid),private.h08_member(uuid),private.h08_scope(uuid,uuid,text,text),
  private.h08_company(uuid,uuid),private.h08_profile(uuid),private.h08_obligation(uuid),private.h08_deliverable(uuid),
  private.h08_grant(uuid),private.h08_notice(uuid),private.h08_channel(text) to authenticated;
grant execute on all functions in schema public to service_role;
revoke all on function public.h08_block_auth_email(jsonb) from service_role;
grant execute on function public.h08_block_auth_email(jsonb) to supabase_auth_admin;
