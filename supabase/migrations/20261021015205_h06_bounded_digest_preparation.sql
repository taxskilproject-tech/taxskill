-- Durable preparation progress; no business history, payload or job activation is changed.
create table private.h06_digest_progress (
  organization_id uuid primary key references public.organizations(id) on delete restrict,
  scan_date date not null,
  last_recipient_id uuid,
  last_attempt_at timestamptz not null,
  last_progress_at timestamptz,
  completed_at timestamptz,
  failed_recipient_id uuid,
  error_code text check(error_code is null or error_code='DEPENDENCY_UNAVAILABLE'),
  foreign key(organization_id,failed_recipient_id) references public.organization_members(organization_id,user_id) on delete restrict
);
alter table private.h06_digest_progress enable row level security;
revoke all on private.h06_digest_progress from public,anon,authenticated;
create index obligations_digest_recipient on public.obligations(organization_id,delivery_responsible_id,id)
  where disposition='active' and delivery_responsible_id is not null;
create index digests_expiration_candidates on public.whatsapp_digests(organization_id,local_date,id)
  where status='pending' and accepted_at is null and expired_at is null;

-- Resolve permissions once per company/module, then aggregate only this recipient's obligations.
create or replace function private.h06_digest_items(p_org uuid,p_recipient uuid,p_today date,p_base_url text,p_own_delivery uuid default null) returns jsonb
language sql stable security definer set search_path='' as $$
  with scopes as materialized (
    select distinct company_id,module from public.obligations
    where organization_id=p_org and delivery_responsible_id=p_recipient and disposition='active'
  ), allowed as materialized (
    select * from scopes where private.h06_visible(p_org,p_recipient,company_id,module)
      and private.has_permission(p_org,p_recipient,company_id,module,'upload')
  ), eligible as materialized (
    select o.* from public.obligations o join allowed a on a.company_id is not distinct from o.company_id and a.module=o.module
    where o.organization_id=p_org and o.delivery_responsible_id=p_recipient and o.disposition='active' and private.h06_operational(o)
  ), candidates as (
    select o.id obligation_id,null::uuid notification_event_id,case when c.due_date<p_today then 'overdue' else 'due_soon' end category,
      o.title,o.snapshot->'destination'->>'company_legal_name' company,o.module,c.due_date,o.priority
    from eligible o join public.organizations org on org.id=o.organization_id
    cross join lateral(select min(c.due_date) due_date from public.submission_cycles c join public.deliverables d on d.id=c.deliverable_id
      where d.obligation_id=o.id and c.state='open' and c.first_submitted_at is null) c
    where c.due_date<=p_today+(org.settings->>'upcoming_days')::integer
    union all
    select o.id,e.id,'observed',o.title,o.snapshot->'destination'->>'company_legal_name',o.module,c.due_date,o.priority
    from eligible o join public.notification_events e on e.organization_id=p_org and e.obligation_id=o.id
    join lateral private.h06_observation_cycle(e) c on true
    where e.event_type='observed' and c.state='open' and c.first_submitted_at is null
      and not exists(select 1 from public.whatsapp_digests d cross join lateral jsonb_array_elements(d.payload->'items') i
        where d.organization_id=p_org and d.delivery_id is distinct from p_own_delivery and i->>'notification_event_id'=e.id::text
          and (d.status in ('accepted','sent','delivered','unknown') or d.status='pending' and d.expired_at is null))
  ) select coalesce(jsonb_agg(jsonb_build_object('obligation_id',obligation_id,'notification_event_id',notification_event_id,'category',category,
    'title',title,'company',company,'module',module,'due_date',due_date,'priority',priority,'url',p_base_url||'/actividades/'||obligation_id)
    order by obligation_id,category,notification_event_id),'[]') from candidates;
$$;

-- Validate a frozen payload against the same authorized facts without repeating permission joins per item.
create or replace function private.h06_digest_eligible(p_digest public.whatsapp_digests,p_today date) returns boolean
language sql stable security definer set search_path='' as $$
  select p_digest.expired_at is null and p_digest.local_date=p_today
    and exists(select 1 from public.profiles p where p.user_id=p_digest.recipient_id and p.enabled and p.deleted_at is null
      and p.provisioning_status='ready' and p.whatsapp_phone=p_digest.payload->>'phone')
    and not exists(
      with current_items as materialized (select value from jsonb_array_elements(private.h06_digest_items(
        p_digest.organization_id,p_digest.recipient_id,p_today,'https://eligibility.invalid',p_digest.delivery_id)))
      select 1 from jsonb_array_elements(p_digest.payload->'items') frozen where not exists(
        select 1 from current_items current where current.value->>'obligation_id'=frozen->>'obligation_id'
          and (frozen->>'category'<>'observed' and current.value->>'category'<>'observed' and current.value->>'due_date'=frozen->>'due_date'
            or frozen->>'category'='observed' and current.value->>'category'='observed'
              and current.value->>'notification_event_id'=frozen->>'notification_event_id')));
$$;

create function private.h06_digest_recipients(p_org uuid,p_today date,p_after uuid,p_limit integer)
returns table(recipient_id uuid,whatsapp_phone text) language sql stable security definer set search_path='' as $$
  select m.user_id,p.whatsapp_phone from public.organization_members m join public.profiles p on p.user_id=m.user_id
  where m.organization_id=p_org and m.active and m.deleted_at is null and p.enabled and p.deleted_at is null and p.provisioning_status='ready'
    and (p_after is null or m.user_id>p_after)
    and exists(select 1 from public.obligations o where o.organization_id=p_org and o.delivery_responsible_id=m.user_id and o.disposition='active')
    and not exists(select 1 from public.whatsapp_digests d where d.organization_id=p_org and d.recipient_id=m.user_id and d.local_date=p_today)
  order by m.user_id limit p_limit;
$$;

drop function public.h06_prepare_digests(text,date,timestamptz);
create function public.h06_prepare_digests(p_base_url text,p_today date default (now() at time zone 'America/Lima')::date,
  p_now timestamptz default now(),p_organization_id uuid default null,p_batch_size integer default 5) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_org uuid; v_previous private.h06_digest_progress; v_recipient record; v_items jsonb; v_delivery uuid;
  v_after uuid; v_last uuid; v_failed uuid; v_count integer:=0; v_missing integer:=0; v_examined integer:=0;
  v_expired integer:=0; v_expiry_more boolean; v_more boolean; v_progress boolean:=false;
begin
  perform private.h06_system();
  if p_base_url is null or p_base_url !~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?$' or p_today is null or p_now is null
    or p_batch_size is null or p_batch_size not between 1 and 10 then perform private.fail('VALIDATION_ERROR'); end if;
  if not pg_try_advisory_xact_lock(hashtextextended('taxskill:h06-digest-preparation',0)) then return '{"status":"busy"}'::jsonb; end if;
  select o.id into v_org from public.organizations o left join private.h06_digest_progress p on p.organization_id=o.id
  where o.status='active' and o.deleted_at is null and (p_organization_id is null or o.id=p_organization_id)
    and (p_now at time zone 'America/Lima')::time>=(o.settings->>'digest_local_time')::time
    and (exists(select 1 from private.h06_digest_recipients(o.id,p_today,null,1))
      or exists(select 1 from public.whatsapp_digests d where d.organization_id=o.id and d.status='pending'
        and d.accepted_at is null and d.expired_at is null and d.local_date<p_today))
  order by p.last_attempt_at nulls first,o.id limit 1 for update of o skip locked;
  if v_org is null then return '{"status":"idle","prepared_count":0,"contact_issues":0,"has_more":false}'::jsonb; end if;
  select * into v_previous from private.h06_digest_progress where organization_id=v_org;
  v_after:=case when v_previous.scan_date=p_today then v_previous.last_recipient_id end;
  v_last:=v_after; v_failed:=v_previous.failed_recipient_id;
  if v_failed is not null and not exists(select 1 from private.h06_digest_recipients(v_org,p_today,null,2147483647) where recipient_id=v_failed) then v_failed:=null; end if;
  -- Expire at most 100 old unaccepted digests first; accepted/unknown observations remain reserved.
  update public.whatsapp_digests set expired_at=p_now,updated_at=p_now,revision=revision+1 where id in (
    select id from public.whatsapp_digests where organization_id=v_org and status='pending' and accepted_at is null
      and expired_at is null and local_date<p_today order by local_date,id limit 100 for update skip locked);
  get diagnostics v_expired=row_count;
  select exists(select 1 from public.whatsapp_digests where organization_id=v_org and status='pending' and accepted_at is null
    and expired_at is null and local_date<p_today) into v_expiry_more;
  if not v_expiry_more then
    for v_recipient in select * from private.h06_digest_recipients(v_org,p_today,v_after,p_batch_size) loop
      begin
        v_items:=private.h06_digest_items(v_org,v_recipient.recipient_id,p_today,p_base_url);
        if jsonb_array_length(v_items)>0 then
          if not coalesce(v_recipient.whatsapp_phone ~ '^\+[1-9][0-9]{7,14}$',false) then
            perform private.h06_admin_issue(v_org,'contact_issue','contact:'||v_recipient.recipient_id||':'||p_today); v_missing:=v_missing+1;
          else
            v_delivery:=gen_random_uuid();
            insert into public.whatsapp_digests(organization_id,recipient_id,local_date,delivery_id,payload)
            values(v_org,v_recipient.recipient_id,p_today,v_delivery,jsonb_build_object('schema_version','1.0','timezone','America/Lima',
              'delivery_id',v_delivery,'recipient_id',v_recipient.recipient_id,'local_date',p_today,'phone',v_recipient.whatsapp_phone,'items',v_items))
            on conflict(organization_id,recipient_id,local_date) do nothing;
            if found then v_count:=v_count+1; end if;
          end if;
        end if;
        if v_failed=v_recipient.recipient_id then v_failed:=null; end if;
        v_progress:=true;
      exception when others then
        v_failed:=v_recipient.recipient_id;
      end;
      v_last:=v_recipient.recipient_id; v_examined:=v_examined+1;
    end loop;
  end if;
  v_more:=v_expiry_more or exists(select 1 from private.h06_digest_recipients(v_org,p_today,v_last,1));
  insert into private.h06_digest_progress(organization_id,scan_date,last_recipient_id,last_attempt_at,last_progress_at,completed_at,failed_recipient_id,error_code)
  values(v_org,p_today,case when v_more then v_last end,clock_timestamp(),case when v_progress or v_expired>0 then clock_timestamp() end,
    case when not v_more then clock_timestamp() end,v_failed,case when v_failed is not null then 'DEPENDENCY_UNAVAILABLE' end)
  on conflict(organization_id) do update set scan_date=excluded.scan_date,last_recipient_id=excluded.last_recipient_id,last_attempt_at=excluded.last_attempt_at,
    last_progress_at=coalesce(excluded.last_progress_at,h06_digest_progress.last_progress_at),completed_at=coalesce(excluded.completed_at,h06_digest_progress.completed_at),
    failed_recipient_id=excluded.failed_recipient_id,error_code=excluded.error_code;
  return jsonb_build_object('status',case when v_failed is not null then 'failed' when v_more then 'pending' else 'completed' end,'organization_id',v_org,
    'prepared_count',v_count,'contact_issues',v_missing,'examined_recipients',v_examined,'expired_count',v_expired,'has_more',v_more);
end $$;
revoke all on function private.h06_digest_recipients(uuid,date,uuid,integer) from public,anon,authenticated;
revoke all on function public.h06_prepare_digests(text,date,timestamptz,uuid,integer) from public,anon,authenticated;
grant execute on function public.h06_prepare_digests(text,date,timestamptz,uuid,integer) to service_role;
notify pgrst,'reload schema';
