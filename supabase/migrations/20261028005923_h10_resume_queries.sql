alter function private.h10_apply_command(uuid,uuid,uuid,text,jsonb) rename to h10_apply_command_base;
create function private.h10_apply_command(org uuid,actor uuid,req uuid,op text,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare conn public.sunat_connections; previous public.sunat_jobs; job_id uuid; first_day date; last_day date;
begin
 if op<>'ResumeSync' then return private.h10_apply_command_base(org,actor,req,op,input); end if;
 perform private.assert_member(org,actor);
 if not private.h10_allowed(org,(input->>'company_id')::uuid,actor) then perform private.fail('FORBIDDEN'); end if;
 select * into conn from public.sunat_connections where organization_id=org and company_id=(input->>'company_id')::uuid and deleted_at is null for update;
 if conn.id is null or conn.state<>'connected' then perform private.fail('CONFLICT'); end if;
 first_day:=make_date((input->>'year')::int,(input->>'month')::int,1);
 last_day:=(first_day+interval '1 month - 1 day')::date;
 select * into previous from public.sunat_jobs where connection_id=conn.id and kind='monthly'
  and from_date=first_day and through_date=last_day and credential_version=conn.credential_version
  order by created_at desc,id desc limit 1;
 if previous.id is null or previous.state<>'partial' or previous.error_code<>'BUDGET_EXHAUSTED' then perform private.fail('CONFLICT'); end if;
 job_id:=private.h10_enqueue(conn,'monthly',req::text,actor,private.h08_session_id(),first_day,last_day);
 update public.sunat_jobs set checkpoint=previous.checkpoint||'{"resume":true}'::jsonb where id=job_id and state='queued';
 return jsonb_build_object('resource_id',conn.id,'job_id',job_id,'revision',conn.revision,'state','queued');
end $$;
revoke all on function private.h10_apply_command(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
