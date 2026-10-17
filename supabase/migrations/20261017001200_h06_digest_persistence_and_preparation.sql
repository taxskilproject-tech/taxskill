create table public.whatsapp_digests (
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
  recipient_id uuid not null references public.profiles(user_id) on delete restrict,local_date date not null,delivery_id uuid not null default gen_random_uuid() unique,
  payload jsonb not null,status text not null default 'pending' check(status in ('pending','accepted','sent','delivered','failed','unknown')),
  http_attempt_count integer not null default 0 check(http_attempt_count between 0 and 3),last_attempt_at timestamptz,accepted_at timestamptz,sent_at timestamptz,delivered_at timestamptz,
  provider_message_id text,last_receipt_id uuid,expired_at timestamptz,last_error_code text,
  outbound_state jsonb not null default '{}',gateway_state jsonb not null default '{}',
  created_at timestamptz not null default now(),created_by uuid references public.profiles(user_id) on delete restrict,
  updated_at timestamptz not null default now(),updated_by uuid references public.profiles(user_id) on delete restrict,revision integer not null default 0 check(revision>=0),
  unique(organization_id,id),unique(organization_id,recipient_id,local_date),
  foreign key(organization_id,recipient_id) references public.organization_members(organization_id,user_id) on delete restrict,
  check(jsonb_typeof(payload)='object' and payload->>'schema_version'='1.0' and payload->>'timezone'='America/Lima'
    and payload->>'delivery_id'=delivery_id::text and payload->>'recipient_id'=recipient_id::text and payload->>'local_date'=local_date::text
    and payload->>'phone' ~ '^\+[1-9][0-9]{7,14}$' and jsonb_typeof(payload->'items')='array' and jsonb_array_length(payload->'items')>0),
  check(expired_at is null or status='pending' and accepted_at is null),check(jsonb_typeof(outbound_state)='object' and jsonb_typeof(gateway_state)='object')
);
create table public.integration_attempts (
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,digest_id uuid not null,
  direction text not null check(direction in ('outbound','callback')),attempt_number integer not null check(attempt_number>=1),batch_id uuid,receipt_id uuid,
  http_status integer check(http_status between 100 and 599),duration_ms integer check(duration_ms>=0),provider_status text check(provider_status in ('sent','delivered','failed','unknown')),
  provider_message_id text,occurred_at timestamptz,error_code text,error_message text check(length(error_message)<=300),result jsonb not null default '{}',
  created_at timestamptz not null default now(),created_by uuid references public.profiles(user_id) on delete restrict,
  unique(organization_id,id),foreign key(organization_id,digest_id) references public.whatsapp_digests(organization_id,id) on delete restrict,
  check(direction='outbound' and batch_id is not null and receipt_id is null and attempt_number<=3 or direction='callback' and receipt_id is not null and batch_id is null and provider_status is not null)
);
create unique index integration_receipt on public.integration_attempts(organization_id,receipt_id) where receipt_id is not null;
create unique index integration_outbound_phase on public.integration_attempts(digest_id,attempt_number,(result->>'phase')) where direction='outbound';
create index digests_pending on public.whatsapp_digests(organization_id,status,local_date);
create index digests_recipient on public.whatsapp_digests(organization_id,recipient_id,local_date desc);
create index integration_digest on public.integration_attempts(organization_id,digest_id,created_at desc);
create index integration_batch on public.integration_attempts(organization_id,batch_id);
create trigger integration_immutable before update or delete on public.integration_attempts for each row execute function private.keep_document_history();
create trigger digest_keep_history before delete on public.whatsapp_digests for each row execute function private.keep_document_history();
create function private.h06_digest_immutable() returns trigger language plpgsql set search_path='' as $$
begin
  if (new.organization_id,new.recipient_id,new.local_date,new.delivery_id,new.payload) is distinct from (old.organization_id,old.recipient_id,old.local_date,old.delivery_id,old.payload) then perform private.fail('FORBIDDEN'); end if;
  return new;
end $$;
create trigger digest_frozen_payload before update on public.whatsapp_digests for each row execute function private.h06_digest_immutable();

create function private.h06_system() returns void language plpgsql security definer set search_path='' as $$
begin if auth.role() is distinct from 'service_role' and session_user<>'postgres' then perform private.fail('FORBIDDEN'); end if; end $$;
create function private.h06_admin_issue(p_org uuid,p_type text,p_key text) returns void
language plpgsql security definer set search_path='' as $$
declare v_event uuid; v_payload jsonb; v_user uuid;
begin
  v_payload:=jsonb_build_object('schema_version',1,'title',case when p_type='contact_issue' then 'Revisar contacto WhatsApp' else 'Revisar integración WhatsApp' end,
    'body','Hay una incidencia administrativa. Consulta el seguimiento de WhatsApp.','target_path','/configuracion','priority','media','due_date',null,'scope_label','Estudio');
  insert into public.notification_events(organization_id,event_key,event_type,payload) values(p_org,p_key,p_type,v_payload) on conflict do nothing returning id into v_event;
  if v_event is null then return; end if;
  for v_user in select m.user_id from public.organization_members m join public.profiles p on p.user_id=m.user_id where m.organization_id=p_org and m.is_admin and m.active and m.deleted_at is null and p.enabled and p.deleted_at is null and p.provisioning_status='ready' loop
    insert into public.notifications(organization_id,recipient_id,event_id,title,body,target_path) values(p_org,v_user,v_event,v_payload->>'title',v_payload->>'body','/configuracion') on conflict do nothing;
  end loop;
end $$;

create function private.h06_digest_items(p_org uuid,p_recipient uuid,p_today date,p_base_url text,p_own_delivery uuid default null) returns jsonb
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
    from public.notification_events e join public.obligations o on o.id=e.obligation_id join public.submission_cycles c on c.id=e.cycle_id
    where e.organization_id=p_org and e.event_type='observed' and o.delivery_responsible_id=p_recipient and private.h06_operational(o)
      and c.state='open' and c.first_submitted_at is null and private.h06_visible(p_org,p_recipient,o.company_id,o.module) and private.has_permission(p_org,p_recipient,o.company_id,o.module,'upload')
      and not exists(select 1 from public.whatsapp_digests d cross join lateral jsonb_array_elements(d.payload->'items') i
        where d.organization_id=p_org and d.delivery_id is distinct from p_own_delivery and i->>'notification_event_id'=e.id::text
          and (d.status in ('accepted','sent','delivered','unknown') or d.status='pending' and d.expired_at is null))
  ) select coalesce(jsonb_agg(jsonb_build_object('obligation_id',obligation_id,'notification_event_id',notification_event_id,'category',category,'title',title,'company',company,'module',module,
      'due_date',due_date,'priority',priority,'url',p_base_url||'/actividades/'||obligation_id) order by obligation_id,category,notification_event_id),'[]') from candidates;
$$;

create function public.h06_prepare_digests(p_base_url text,p_today date default (now() at time zone 'America/Lima')::date,p_now timestamptz default now()) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_recipient record; v_items jsonb; v_id uuid; v_count integer:=0; v_missing integer:=0;
begin
  perform private.h06_system();
  if p_base_url !~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?$' or p_today is null or p_now is null then perform private.fail('VALIDATION_ERROR'); end if;
  update public.whatsapp_digests set expired_at=p_now,updated_at=p_now,revision=revision+1 where status='pending' and accepted_at is null and expired_at is null and local_date<p_today;
  for v_recipient in select distinct o.organization_id,o.delivery_responsible_id recipient_id,p.whatsapp_phone
    from public.obligations o join public.profiles p on p.user_id=o.delivery_responsible_id join public.organizations org on org.id=o.organization_id
    where private.h06_operational(o) and p.enabled and p.deleted_at is null and p.provisioning_status='ready'
      and (p_now at time zone 'America/Lima')::time>=(org.settings->>'digest_local_time')::time
      and not exists(select 1 from public.whatsapp_digests d where d.organization_id=o.organization_id and d.recipient_id=o.delivery_responsible_id and d.local_date=p_today)
    order by o.organization_id,o.delivery_responsible_id loop
    perform 1 from public.organizations where id=v_recipient.organization_id for update;
    v_items:=private.h06_digest_items(v_recipient.organization_id,v_recipient.recipient_id,p_today,p_base_url);
    if jsonb_array_length(v_items)=0 then continue; end if;
    if not coalesce(v_recipient.whatsapp_phone ~ '^\+[1-9][0-9]{7,14}$',false) then
      perform private.h06_admin_issue(v_recipient.organization_id,'contact_issue','contact:'||v_recipient.recipient_id||':'||p_today); v_missing:=v_missing+1; continue;
    end if;
    v_id:=gen_random_uuid();
    insert into public.whatsapp_digests(organization_id,recipient_id,local_date,delivery_id,payload)
      values(v_recipient.organization_id,v_recipient.recipient_id,p_today,v_id,jsonb_build_object('schema_version','1.0','timezone','America/Lima','delivery_id',v_id,'recipient_id',v_recipient.recipient_id,'local_date',p_today,'phone',v_recipient.whatsapp_phone,'items',v_items)) on conflict(organization_id,recipient_id,local_date) do nothing;
    if found then v_count:=v_count+1; end if;
  end loop;
  return jsonb_build_object('status','completed','prepared_count',v_count,'contact_issues',v_missing);
end $$;

create function private.h06_digest_eligible(p_digest public.whatsapp_digests,p_today date) returns boolean
language sql stable security definer set search_path='' as $$
  select p_digest.expired_at is null and p_digest.local_date=p_today and exists(select 1 from public.profiles p where p.user_id=p_digest.recipient_id and p.enabled and p.deleted_at is null and p.provisioning_status='ready' and p.whatsapp_phone=p_digest.payload->>'phone')
    and not exists(select 1 from jsonb_array_elements(p_digest.payload->'items') i where not exists(
      select 1 from public.obligations o join public.h03_obligation_summary s on s.id=o.id where o.id=(i->>'obligation_id')::uuid and o.organization_id=p_digest.organization_id
        and o.delivery_responsible_id=p_digest.recipient_id and private.h06_operational(o) and private.h06_visible(o.organization_id,p_digest.recipient_id,o.company_id,o.module)
        and private.has_permission(o.organization_id,p_digest.recipient_id,o.company_id,o.module,'upload')
        and (i->>'category'<>'observed' and s.operational_due_date=(i->>'due_date')::date
          or i->>'category'='observed' and exists(select 1 from public.notification_events e join public.submission_cycles c on c.id=e.cycle_id where e.id=(i->>'notification_event_id')::uuid and e.obligation_id=o.id and c.state='open' and c.first_submitted_at is null))));
$$;
revoke all on function public.h06_prepare_digests(text,date,timestamptz) from public,anon,authenticated;
grant execute on function public.h06_prepare_digests(text,date,timestamptz) to service_role;
revoke all on public.whatsapp_digests,public.integration_attempts from anon,authenticated;
grant all on public.whatsapp_digests,public.integration_attempts to service_role;
do $$ declare v_proc record; begin
  for v_proc in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname like 'h06_%' loop execute format('revoke all on function %s from public,anon,authenticated',v_proc.signature); end loop;
end $$;
