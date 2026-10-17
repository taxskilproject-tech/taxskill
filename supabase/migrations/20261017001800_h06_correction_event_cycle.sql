-- A review references the submitted version; its reminder belongs to the new correction cycle.
-- Resolve legacy H03 events without rewriting immutable event history.
create function private.h06_observation_cycle(p_event public.notification_events) returns public.submission_cycles
language sql stable security definer set search_path='' as $$
  select next_cycle from public.review_events review
    join public.document_versions version on version.id=review.version_id and version.organization_id=review.organization_id
    join public.submission_cycles reviewed on reviewed.id=version.cycle_id
    join public.submission_cycles next_cycle on next_cycle.deliverable_id=review.deliverable_id and next_cycle.cycle_number=reviewed.cycle_number+1
    where review.id=p_event.review_event_id and review.organization_id=p_event.organization_id and review.decision='observe';
$$;
revoke all on function private.h06_observation_cycle(public.notification_events) from public,anon,authenticated;

create or replace function private.document_event(obligation public.obligations,actor uuid,p_event_type text,p_event_key text,review_id uuid default null,cycle uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare v_cycle uuid:=cycle;
begin
  if p_event_type in ('observed','reopened') then
    select next_cycle.id into v_cycle from public.review_events review
      join public.document_versions version on version.id=review.version_id and version.organization_id=review.organization_id
      join public.submission_cycles reviewed on reviewed.id=version.cycle_id
      join public.submission_cycles next_cycle on next_cycle.deliverable_id=review.deliverable_id and next_cycle.cycle_number=reviewed.cycle_number+1
      where review.id=review_id and review.organization_id=obligation.organization_id;
    if v_cycle is null then perform private.fail('DEPENDENCY_UNAVAILABLE'); end if;
  end if;
  perform private.h06_event(obligation,actor,p_event_type,p_event_key,review_id,v_cycle);
end $$;

create or replace function private.h06_digest_items(p_org uuid,p_recipient uuid,p_today date,p_base_url text,p_own_delivery uuid default null) returns jsonb
language sql stable security definer set search_path='' as $$
  with candidates as(
    select s.id obligation_id,null::uuid notification_event_id,case when s.operational_due_date<p_today then 'overdue' else 'due_soon' end category,
      s.title,s.company_name company,s.module,s.operational_due_date due_date,s.priority
    from public.h03_obligation_summary s join public.obligations o on o.id=s.id join public.organizations org on org.id=s.organization_id
    where s.organization_id=p_org and s.delivery_responsible_id=p_recipient and private.h06_operational(o)
      and private.h06_visible(p_org,p_recipient,s.company_id,s.module) and private.has_permission(p_org,p_recipient,s.company_id,s.module,'upload')
      and s.operational_due_date<=p_today+(org.settings->>'upcoming_days')::integer
    union all
    select o.id,e.id,'observed',o.title,o.snapshot->'destination'->>'company_legal_name',o.module,c.due_date,o.priority
    from public.notification_events e join public.obligations o on o.id=e.obligation_id join lateral private.h06_observation_cycle(e) c on true
    where e.organization_id=p_org and e.event_type='observed' and o.delivery_responsible_id=p_recipient and private.h06_operational(o)
      and c.state='open' and c.first_submitted_at is null and private.h06_visible(p_org,p_recipient,o.company_id,o.module) and private.has_permission(p_org,p_recipient,o.company_id,o.module,'upload')
      and not exists(select 1 from public.whatsapp_digests d cross join lateral jsonb_array_elements(d.payload->'items') i
        where d.organization_id=p_org and d.delivery_id is distinct from p_own_delivery and i->>'notification_event_id'=e.id::text
          and (d.status in ('accepted','sent','delivered','unknown') or d.status='pending' and d.expired_at is null))
  ) select coalesce(jsonb_agg(jsonb_build_object('obligation_id',obligation_id,'notification_event_id',notification_event_id,'category',category,'title',title,'company',company,'module',module,
      'due_date',due_date,'priority',priority,'url',p_base_url||'/actividades/'||obligation_id) order by obligation_id,category,notification_event_id),'[]') from candidates;
$$;

create or replace function private.h06_digest_eligible(p_digest public.whatsapp_digests,p_today date) returns boolean
language sql stable security definer set search_path='' as $$
  select p_digest.expired_at is null and p_digest.local_date=p_today and exists(select 1 from public.profiles p where p.user_id=p_digest.recipient_id and p.enabled and p.deleted_at is null and p.provisioning_status='ready' and p.whatsapp_phone=p_digest.payload->>'phone')
    and not exists(select 1 from jsonb_array_elements(p_digest.payload->'items') i where not exists(
      select 1 from public.obligations o join public.h03_obligation_summary s on s.id=o.id where o.id=(i->>'obligation_id')::uuid and o.organization_id=p_digest.organization_id
        and o.delivery_responsible_id=p_digest.recipient_id and private.h06_operational(o) and private.h06_visible(o.organization_id,p_digest.recipient_id,o.company_id,o.module)
        and private.has_permission(o.organization_id,p_digest.recipient_id,o.company_id,o.module,'upload')
        and (i->>'category'<>'observed' and s.operational_due_date=(i->>'due_date')::date
          or i->>'category'='observed' and exists(select 1 from public.notification_events e join lateral private.h06_observation_cycle(e) c on true where e.id=(i->>'notification_event_id')::uuid and e.obligation_id=o.id and c.state='open' and c.first_submitted_at is null))));
$$;
