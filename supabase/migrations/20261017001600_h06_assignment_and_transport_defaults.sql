create or replace function public.h06_run_deadlines(p_today date default (now() at time zone 'America/Lima')::date) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_obligation public.obligations; v_cycle record; v_issue boolean; v_count integer:=0;
begin
  if auth.role() is distinct from 'service_role' and session_user<>'postgres' then perform private.fail('FORBIDDEN'); end if;
  if p_today is null then perform private.fail('VALIDATION_ERROR'); end if;
  for v_obligation in select o.* from public.obligations o where private.h06_operational(o) order by o.organization_id,o.id loop
    v_issue:=v_obligation.delivery_responsible_id is null or not private.has_permission(v_obligation.organization_id,v_obligation.delivery_responsible_id,v_obligation.company_id,v_obligation.module,'upload');
    if v_obligation.assignment_issue is distinct from v_issue then update public.obligations set assignment_issue=v_issue,revision=revision+1,updated_at=now(),updated_by=null where id=v_obligation.id returning * into v_obligation; end if;
    if v_issue then perform private.h06_event(v_obligation,null,'assignment_issue','assignment_issue:'||v_obligation.id||':'||coalesce(v_obligation.delivery_responsible_id::text,'none')||':'||v_obligation.revision); continue; end if;
    for v_cycle in select c.id,c.due_date from public.submission_cycles c join public.deliverables d on d.id=c.deliverable_id where d.obligation_id=v_obligation.id and c.state='open' and c.first_submitted_at is null and c.due_date-p_today=any(array[7,3,1,0,-1]) loop
      perform private.h06_event(v_obligation,null,case when v_cycle.due_date<p_today then 'overdue' when v_cycle.due_date=p_today then 'due_today' else 'due_soon' end,
        'deadline:'||v_cycle.id||':'||(v_cycle.due_date-p_today),null,v_cycle.id,v_cycle.due_date-p_today); v_count:=v_count+1;
    end loop;
  end loop;
  return jsonb_build_object('status','completed','examined_thresholds',v_count);
end $$;

create or replace function public.h06_finish_dispatch(p_attempt_id uuid,p_http_status integer default null,p_duration_ms integer default 0,p_outcome text default 'responded',p_accepted boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_attempt public.integration_attempts; v_digest public.whatsapp_digests; v_retry boolean; v_error text;
begin
  perform private.h06_system();
  if p_outcome not in ('responded','timeout','connection_error') or p_duration_ms is null or p_duration_ms<0 or (p_http_status is not null and p_http_status not between 100 and 599) then perform private.fail('VALIDATION_ERROR'); end if;
  v_retry:=p_http_status is null or p_http_status=429 or p_http_status>=500;
  v_error:=case when p_accepted and p_http_status between 200 and 299 then null when p_outcome='timeout' then 'HTTP_TIMEOUT' when p_outcome='connection_error' then 'CONNECTION_ERROR' when v_retry then 'HTTP_RETRYABLE' else 'WEBHOOK_REJECTED' end;
  for v_attempt in select * from public.integration_attempts where result->>'attempt_id'=p_attempt_id::text and result->>'phase'='reserved' order by digest_id loop
    select * into v_digest from public.whatsapp_digests where id=v_attempt.digest_id for update;
    insert into public.integration_attempts(organization_id,digest_id,direction,attempt_number,batch_id,http_status,duration_ms,error_code,result)
      values(v_attempt.organization_id,v_attempt.digest_id,'outbound',v_attempt.attempt_number,v_attempt.batch_id,p_http_status,p_duration_ms,v_error,
        jsonb_build_object('phase','finished','attempt_id',p_attempt_id,'accepted',v_error is null,'transport_outcome',p_outcome,'confirmed_by','n8n')) on conflict do nothing;
    if not found then continue; end if;
    update public.whatsapp_digests set status=case when status='pending' and v_error is null then 'accepted' when status='pending' and v_error is not null and not v_retry then 'failed' else status end,
      accepted_at=case when v_error is null then coalesce(accepted_at,now()) else accepted_at end,last_error_code=v_error,updated_at=now(),revision=revision+1,
      outbound_state=outbound_state||jsonb_build_object('retryable',v_retry and v_attempt.attempt_number<3,'last_transport_outcome',p_outcome,
        'lease_expires_at',case when not v_retry or v_attempt.attempt_number>=3 then now() else (outbound_state->>'lease_expires_at')::timestamptz end) where id=v_digest.id;
    if v_error is not null and (not v_retry or v_attempt.attempt_number>=3) then perform private.h06_admin_issue(v_digest.organization_id,'integration_issue','dispatch:'||v_digest.id||':'||v_error); end if;
  end loop;
  return jsonb_build_object('retryable',v_retry,'accepted',v_error is null);
end $$;

