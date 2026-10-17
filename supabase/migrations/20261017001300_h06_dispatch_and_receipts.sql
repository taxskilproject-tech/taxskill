create function public.h06_claim_batch() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_digest public.whatsapp_digests; v_batch uuid; v_lease uuid:=gen_random_uuid(); v_generated timestamptz; v_payload jsonb; v_id uuid;
begin
  perform private.h06_system();
  select * into v_digest from public.whatsapp_digests d where d.expired_at is null and d.http_attempt_count<3
    and (d.status='pending' and d.outbound_state->>'batch_id' is null or coalesce((d.outbound_state->>'retryable')::boolean,false))
    and coalesce((d.outbound_state->>'lease_expires_at')::timestamptz,'-infinity')<now() order by d.created_at,d.id limit 1 for update skip locked;
  if v_digest.id is null then return jsonb_build_object('status','idle'); end if;
  if v_digest.outbound_state->>'batch_id' is not null then
    v_batch:=(v_digest.outbound_state->>'batch_id')::uuid; v_generated:=(v_digest.outbound_state->>'generated_at')::timestamptz;
    update public.whatsapp_digests set outbound_state=outbound_state||jsonb_build_object('lease_id',v_lease,'lease_expires_at',now()+interval '60 seconds') where outbound_state->>'batch_id'=v_batch::text;
  else
    v_batch:=gen_random_uuid(); v_generated:=now();
    for v_id in select id from public.whatsapp_digests where organization_id=v_digest.organization_id and status='pending' and expired_at is null and outbound_state->>'batch_id' is null order by created_at,id limit 50 for update skip locked loop
      select * into v_digest from public.whatsapp_digests where id=v_id;
      if not private.h06_digest_eligible(v_digest,(now() at time zone 'America/Lima')::date) then
        update public.whatsapp_digests set status='failed',last_error_code='NO_LONGER_ELIGIBLE',revision=revision+1,updated_at=now() where id=v_id;
        perform private.h06_admin_issue(v_digest.organization_id,'integration_issue','digest-ineligible:'||v_id); continue;
      end if;
      update public.whatsapp_digests set outbound_state=jsonb_build_object('batch_id',v_batch,'generated_at',v_generated,'lease_id',v_lease,'lease_expires_at',now()+interval '60 seconds','retryable',true) where id=v_id;
    end loop;
  end if;
  select jsonb_build_object('schema_version','1.0','batch_id',v_batch,'event_type','whatsapp.digest.batch','generated_at',v_generated,'timezone','America/Lima',
    'digests',coalesce(jsonb_agg(payload-array['schema_version','timezone'] order by id),'[]')) into v_payload from public.whatsapp_digests where outbound_state->>'batch_id'=v_batch::text;
  if jsonb_array_length(v_payload->'digests')=0 then return jsonb_build_object('status','idle'); end if;
  return jsonb_build_object('status','ready','lease_id',v_lease,'batch',v_payload);
end $$;

create function public.h06_begin_dispatch(p_batch_id uuid,p_lease_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_digest public.whatsapp_digests; v_attempt uuid:=gen_random_uuid(); v_count integer:=0; v_number integer;
begin
  perform private.h06_system();
  for v_digest in select * from public.whatsapp_digests where outbound_state->>'batch_id'=p_batch_id::text order by id for update loop
    if v_digest.outbound_state->>'lease_id' is distinct from p_lease_id::text or (v_digest.outbound_state->>'lease_expires_at')::timestamptz<now() or v_digest.http_attempt_count>=3 then perform private.fail('CONFLICT'); end if;
    v_number:=v_digest.http_attempt_count+1;
    update public.whatsapp_digests set http_attempt_count=v_number,last_attempt_at=now(),updated_at=now(),revision=revision+1,outbound_state=outbound_state||jsonb_build_object('attempt_id',v_attempt) where id=v_digest.id;
    insert into public.integration_attempts(organization_id,digest_id,direction,attempt_number,batch_id,result)
      values(v_digest.organization_id,v_digest.id,'outbound',v_number,p_batch_id,jsonb_build_object('phase','reserved','attempt_id',v_attempt)); v_count:=v_count+1;
  end loop;
  if v_count=0 then perform private.fail('NOT_FOUND'); end if;
  return jsonb_build_object('attempt_id',v_attempt,'attempt_number',v_number);
end $$;

create function public.h06_finish_dispatch(p_attempt_id uuid,p_http_status integer,p_duration_ms integer,p_outcome text,p_accepted boolean) returns jsonb
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

create function private.h06_validate_receipt(p_receipt jsonb) returns void language plpgsql set search_path='' as $$
begin
  if jsonb_typeof(p_receipt)<>'object' or p_receipt->>'schema_version' is distinct from '1.0'
    or (p_receipt->>'receipt_id')::uuid is null or (p_receipt->>'delivery_id')::uuid is null
    or not coalesce(p_receipt->>'status' in ('sent','delivered','failed','unknown'),false) or (p_receipt->>'occurred_at')::timestamptz is null
    or (p_receipt->>'occurred_at')::timestamptz>now()+interval '5 minutes'
    or (p_receipt->>'status' in ('sent','delivered') and nullif(btrim(p_receipt->>'provider_message_id'),'') is null)
    or length(coalesce(p_receipt->>'provider_message_id',''))>200
    or (p_receipt->>'error_code' is not null and p_receipt->>'error_code' !~ '^[A-Z0-9_]{1,80}$')
    or exists(select 1 from jsonb_object_keys(p_receipt) k where k not in ('schema_version','receipt_id','delivery_id','status','occurred_at','provider_message_id','error_code')) then perform private.fail('VALIDATION_ERROR'); end if;
end $$;

create function public.h06_gateway_claim(p_delivery_id uuid,p_digest jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_digest public.whatsapp_digests; v_claim uuid:=gen_random_uuid(); v_receipt uuid:=gen_random_uuid();
begin
  perform private.h06_system();
  select * into v_digest from public.whatsapp_digests where delivery_id=p_delivery_id for update;
  if v_digest.id is null then perform private.fail('NOT_FOUND'); end if;
  if p_digest is distinct from (v_digest.payload-array['schema_version','timezone']) then perform private.fail('CONFLICT'); end if;
  if v_digest.gateway_state->>'claim_id' is not null then return jsonb_build_object('send',false,'status',v_digest.status,'receipt',v_digest.gateway_state->'receipt'); end if;
  if not private.h06_digest_eligible(v_digest,(now() at time zone 'America/Lima')::date) then
    update public.whatsapp_digests set status='failed',last_error_code='NO_LONGER_ELIGIBLE',updated_at=now(),revision=revision+1 where id=v_digest.id;
    return jsonb_build_object('send',false,'status','failed');
  end if;
  update public.whatsapp_digests set status='accepted',accepted_at=coalesce(accepted_at,now()),updated_at=now(),revision=revision+1,
    gateway_state=jsonb_build_object('claim_id',v_claim,'claimed_at',now(),'receipt_id',v_receipt,'receipt',null) where id=v_digest.id;
  return jsonb_build_object('send',true,'claim_id',v_claim,'receipt_id',v_receipt,'status','accepted');
end $$;

create function public.h06_gateway_complete(p_delivery_id uuid,p_claim_id uuid,p_receipt jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_digest public.whatsapp_digests;
begin
  perform private.h06_system(); perform private.h06_validate_receipt(p_receipt);
  select * into v_digest from public.whatsapp_digests where delivery_id=p_delivery_id for update;
  if v_digest.id is null then perform private.fail('NOT_FOUND'); end if;
  if v_digest.gateway_state->>'claim_id' is distinct from p_claim_id::text or p_receipt->>'delivery_id' is distinct from p_delivery_id::text
    or p_receipt->>'receipt_id' is distinct from v_digest.gateway_state->>'receipt_id' then perform private.fail('CONFLICT'); end if;
  if v_digest.gateway_state->'receipt' is not null and v_digest.gateway_state->'receipt'<>'null'::jsonb and v_digest.gateway_state->'receipt' is distinct from p_receipt then perform private.fail('CONFLICT'); end if;
  update public.whatsapp_digests set gateway_state=gateway_state||jsonb_build_object('receipt',p_receipt),updated_at=now(),revision=revision+1 where id=v_digest.id;
  return p_receipt;
end $$;

create function private.h06_apply_receipt(p_receipt jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_digest public.whatsapp_digests; v_existing public.integration_attempts; v_status text; v_sequence integer; v_applied boolean; v_last_time timestamptz;
begin
  perform private.h06_validate_receipt(p_receipt);
  select * into v_digest from public.whatsapp_digests where delivery_id=(p_receipt->>'delivery_id')::uuid for update;
  if v_digest.id is null or v_digest.http_attempt_count=0 and v_digest.gateway_state->>'claim_id' is null then perform private.fail('NOT_FOUND'); end if;
  select * into v_existing from public.integration_attempts where organization_id=v_digest.organization_id and receipt_id=(p_receipt->>'receipt_id')::uuid;
  if v_existing.id is not null then
    if v_existing.digest_id<>v_digest.id or v_existing.provider_status<>p_receipt->>'status' or v_existing.occurred_at<>(p_receipt->>'occurred_at')::timestamptz
      or v_existing.provider_message_id is distinct from (p_receipt->>'provider_message_id') or v_existing.error_code is distinct from (p_receipt->>'error_code') then perform private.fail('CONFLICT'); end if;
    return jsonb_build_object('delivery_id',v_digest.delivery_id,'status',v_digest.status,'duplicate',true);
  end if;
  if v_digest.provider_message_id is not null and p_receipt->>'provider_message_id' is not null and v_digest.provider_message_id<>p_receipt->>'provider_message_id' then perform private.fail('CONFLICT'); end if;
  select max(occurred_at),count(*)+1 into v_last_time,v_sequence from public.integration_attempts where digest_id=v_digest.id and direction='callback';
  v_status:=p_receipt->>'status';
  v_applied:=v_digest.status<>'delivered' and (v_status='delivered' or v_last_time is null or (p_receipt->>'occurred_at')::timestamptz>=v_last_time)
    and not (v_digest.status='sent' and v_status='unknown');
  insert into public.integration_attempts(organization_id,digest_id,direction,attempt_number,receipt_id,provider_status,provider_message_id,occurred_at,error_code,result)
    values(v_digest.organization_id,v_digest.id,'callback',v_sequence,(p_receipt->>'receipt_id')::uuid,v_status,p_receipt->>'provider_message_id',(p_receipt->>'occurred_at')::timestamptz,p_receipt->>'error_code',jsonb_build_object('confirmed_by','provider','applied',v_applied));
  if v_applied then
    update public.whatsapp_digests set status=v_status,provider_message_id=coalesce(provider_message_id,p_receipt->>'provider_message_id'),last_receipt_id=(p_receipt->>'receipt_id')::uuid,
      sent_at=case when v_status in ('sent','delivered') then coalesce(sent_at,(p_receipt->>'occurred_at')::timestamptz) else sent_at end,
      delivered_at=case when v_status='delivered' then (p_receipt->>'occurred_at')::timestamptz else delivered_at end,last_error_code=p_receipt->>'error_code',
      updated_at=now(),revision=revision+1,expired_at=null,outbound_state=outbound_state||jsonb_build_object('retryable',false) where id=v_digest.id;
    if v_status in ('failed','unknown') then perform private.h06_admin_issue(v_digest.organization_id,'integration_issue','provider:'||v_digest.id||':'||v_status); end if;
  end if;
  return jsonb_build_object('delivery_id',v_digest.delivery_id,'status',(select status from public.whatsapp_digests where id=v_digest.id),'duplicate',false);
end $$;
create function public.h06_receive_receipt(p_receipt jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin perform private.h06_system(); return private.h06_apply_receipt(p_receipt); end $$;

do $$ declare v_proc record; begin
  for v_proc in select p.oid::regprocedure signature,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname like 'h06_%' and n.nspname in ('private','public') loop
    execute format('revoke all on function %s from public,anon,authenticated',v_proc.signature);
    if v_proc.nspname='public' then execute format('grant execute on function %s to service_role',v_proc.signature); end if;
  end loop;
end $$;
grant execute on function public.h06_query(uuid,text,jsonb) to authenticated;
