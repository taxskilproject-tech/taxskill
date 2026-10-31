create function private.h10_eligible(org uuid,company uuid,actor uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.organization_members m join public.profiles p on p.user_id=m.user_id
  join public.organizations o on o.id=m.organization_id join public.companies c on c.organization_id=o.id and c.id=company
  where m.organization_id=org and m.user_id=actor and m.member_type='internal' and m.active and m.deleted_at is null
   and p.enabled and p.provisioning_status='ready' and p.deleted_at is null and o.status='active' and o.deleted_at is null
   and c.status='active' and c.deleted_at is null
   and (m.is_admin or exists(select 1 from public.permissions ap where ap.organization_id=org and ap.action='view'
    and private.has_permission(org,actor,company,ap.module,'view'))));
$$;
create function private.h10_allowed(org uuid,company uuid,actor uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.h10_eligible(org,company,actor) and exists(select 1 from public.organization_members m
  where m.organization_id=org and m.user_id=actor and (m.is_admin or exists(select 1 from public.sunat_access_grants g
   where g.organization_id=org and g.company_id=company and g.member_id=m.id and g.active and g.deleted_at is null)));
$$;
create function private.h10_read(org uuid,company uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.h08_session_valid(org) and private.h10_allowed(org,company,auth.uid());
$$;
do $$ declare t text; begin
 foreach t in array array['sunat_connections','sunat_jobs','sunat_messages','sunat_attachments','sunat_month_queries'] loop
  execute format('create policy h10_read on public.%I for select to authenticated using(private.h10_read(organization_id,company_id))',t);
 end loop;
end $$;
create policy h10_admin_access on public.sunat_access_grants for select to authenticated using(private.h08_admin(organization_id));
create policy h10_personal_alert on public.sunat_notifications for select to authenticated
 using(recipient_id=auth.uid() and private.h10_read(organization_id,company_id));
create policy h10_private_files on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id<>'sunat-mailbox') with check(bucket_id<>'sunat-mailbox');
grant execute on function private.h10_read(uuid,uuid) to authenticated;
revoke all on function private.h10_eligible(uuid,uuid,uuid),private.h10_allowed(uuid,uuid,uuid) from public,anon,authenticated;

create function private.h10_audit(org uuid,actor uuid,company uuid,req uuid,action_name text,resource text,row_id uuid,details jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
 insert into public.audit_events(organization_id,actor_kind,actor_user_id,system_actor,company_id,action,resource_table,resource_id,request_id,metadata)
 values(org,case when actor is null then 'system' else 'user' end,actor,case when actor is null then 'h10-sunat-worker' end,
  company,action_name,resource,row_id,req,jsonb_build_object('source','sunat','details',details));
end $$;

create function public.h10_query(p_organization_id uuid,p_resource text,p_input jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare org uuid:=p_organization_id; company uuid:=(p_input->>'company_id')::uuid;
 actor uuid:=auth.uid(); member public.organization_members; result jsonb; rows jsonb; total bigint;
 page_no int:=coalesce((p_input->>'page')::int,1); yr int:=coalesce((p_input->>'year')::int,extract(year from now() at time zone 'America/Lima')::int);
 mon int:=coalesce((p_input->>'month')::int,extract(month from now() at time zone 'America/Lima')::int);
 target public.organization_members; message public.sunat_messages;
begin
 perform private.admit_session(org); member:=private.assert_member(org,actor);
 if member.member_type<>'internal' then perform private.fail('FORBIDDEN'); end if;
 if page_no not between 1 and 100000 or yr not between 1990 and 2200 or mon not between 1 and 12
  or length(coalesce(p_input->>'q',''))>150 then perform private.fail('VALIDATION_ERROR'); end if;
 if p_resource='access' then
  if not member.is_admin then perform private.fail('FORBIDDEN'); end if;
  select * into target from public.organization_members where organization_id=org and id=(p_input->>'member_id')::uuid;
  if target.id is null or target.member_type<>'internal' then perform private.fail('FORBIDDEN'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('company_id',c.id,'legal_name',c.legal_name,'ruc',c.ruc,
   'grant_id',g.id,'revision',coalesce(g.revision,0),'allowed',coalesce(g.active and g.deleted_at is null,false)) order by c.legal_name),'[]')
   into rows from public.companies c left join public.sunat_access_grants g
    on g.organization_id=org and g.company_id=c.id and g.member_id=target.id
   where c.organization_id=org and private.h10_eligible(org,c.id,target.user_id);
  return jsonb_build_object('ok',true,'data',jsonb_build_object('rows',rows,'is_admin',target.is_admin));
 end if;
 if p_resource in ('alerts','alert_count') then
  select count(*) into total from public.sunat_notifications n where n.organization_id=org and n.recipient_id=actor
   and private.h10_allowed(org,n.company_id,actor) and (company is null or n.company_id=company)
   and (p_resource='alerts' and not coalesce((p_input->>'unread_only')::boolean,false) or n.read_at is null);
  select coalesce(jsonb_agg(to_jsonb(n)),'[]') into rows from (
   select n.* from public.sunat_notifications n where n.organization_id=org and n.recipient_id=actor
    and private.h10_allowed(org,n.company_id,actor) and (company is null or n.company_id=company)
    and (not coalesce((p_input->>'unread_only')::boolean,false) or n.read_at is null)
   order by n.created_at desc,n.id limit 25 offset (page_no-1)*25) n;
  return jsonb_build_object('ok',true,'data',jsonb_build_object('rows',rows,'count',total));
 end if;
 if company is null or not private.h10_allowed(org,company,actor) then perform private.fail('FORBIDDEN'); end if;
 if p_resource in ('workspace','connection_context') then
  if p_resource='connection_context' and not member.is_admin then perform private.fail('FORBIDDEN'); end if;
  select jsonb_build_object('connection',(select to_jsonb(c) from public.sunat_connections c
    where c.organization_id=org and c.company_id=company and c.deleted_at is null),
   'company',(select jsonb_build_object('id',c.id,'ruc',c.ruc,'legal_name',c.legal_name) from public.companies c where c.organization_id=org and c.id=company),
   'jobs',coalesce((select jsonb_agg(j order by j.created_at desc) from (select id,kind,state,progress,error_code,created_at,finished_at,from_date,through_date
    from public.sunat_jobs where organization_id=org and company_id=company order by created_at desc limit 8) j),'[]'),
   'months',coalesce((select jsonb_agg(q) from public.sunat_month_queries q where q.organization_id=org and q.company_id=company and q.year=yr and q.month=mon),'[]'),
   'worker_ready',exists(select 1 from private.sunat_worker_runtime where last_seen_at>now()-interval '90 seconds'),
   'worker_mode',(select mode from private.sunat_worker_runtime where id='primary')) into result;
 elsif p_resource='messages' then
  select count(*) into total from public.sunat_messages m where m.organization_id=org and m.company_id=company
   and m.published_on>=make_date(yr,mon,1) and m.published_on<(make_date(yr,mon,1)+interval '1 month')::date
   and (coalesce(p_input->>'mailbox','all')='all' or m.mailbox=p_input->>'mailbox')
   and position(lower(coalesce(p_input->>'q','')) in lower(m.subject))>0;
  select coalesce(jsonb_agg(to_jsonb(m)),'[]') into rows from (
   select m.id,m.mailbox,m.source_id,m.published_on,m.subject,m.source_read,m.has_attachments,m.details_loaded_at
   from public.sunat_messages m where m.organization_id=org and m.company_id=company
    and m.published_on>=make_date(yr,mon,1) and m.published_on<(make_date(yr,mon,1)+interval '1 month')::date
    and (coalesce(p_input->>'mailbox','all')='all' or m.mailbox=p_input->>'mailbox')
    and position(lower(coalesce(p_input->>'q','')) in lower(m.subject))>0
   order by m.published_on desc,m.id limit 25 offset (page_no-1)*25) m;
  result:=jsonb_build_object('rows',rows,'count',total);
 elsif p_resource='message' then
  select * into message from public.sunat_messages where organization_id=org and company_id=company and id=(p_input->>'message_id')::uuid;
  if message.id is null then perform private.fail('NOT_FOUND'); end if;
  result:=jsonb_build_object('message',to_jsonb(message),'attachments',
   coalesce((select jsonb_agg(a order by a.created_at,a.id) from public.sunat_attachments a where a.message_id=message.id),'[]'));
 else perform private.fail('VALIDATION_ERROR');
 end if;
 return jsonb_build_object('ok',true,'data',result);
exception when raise_exception then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',sqlerrm));
 when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
  return jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR'));
end $$;
revoke all on function public.h10_query(uuid,text,jsonb) from public,anon;
grant execute on function public.h10_query(uuid,text,jsonb) to authenticated;
revoke all on function private.h10_audit(uuid,uuid,uuid,uuid,text,text,uuid,jsonb) from public,anon,authenticated;

alter function public.h02_context() rename to h10_context_legacy;
alter function public.h10_context_legacy() set schema private;
create function public.h02_context() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; org uuid;
begin
 result:=private.h10_context_legacy(); if result->>'ok'<>'true' then return result; end if;
 org:=(result->'data'->'organization'->>'id')::uuid;
 return jsonb_set(result,'{data,mailbox_company_ids}',coalesce((select jsonb_agg(c.id) from public.companies c
  where c.organization_id=org and private.h10_allowed(org,c.id,auth.uid())),'[]'));
end $$;
revoke all on function public.h02_context() from public,anon;
grant execute on function public.h02_context() to authenticated;
revoke all on function private.h10_context_legacy() from public,anon,authenticated;
