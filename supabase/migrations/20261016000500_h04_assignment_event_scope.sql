-- Avoid PL/pgSQL parameter/column ambiguity in the deduplication target.
create or replace function private.h04_assignment_event(obligation public.obligations, actor uuid, event_type text, event_key text) returns void
language plpgsql security definer set search_path='' as $$
declare v_event uuid; v_payload jsonb; v_recipient uuid;
begin
  v_payload:=jsonb_build_object('schema_version',1,'title',obligation.title,'body',case when event_type='assignment_issue' then 'Hay una incidencia de responsable. Revisa la asignación.' else 'Tienes una obligación asignada.' end,
    'target_path','/actividades/'||obligation.id,'priority',obligation.priority,'due_date',obligation.initial_due_date,
    'scope_label',obligation.snapshot->'destination'->>'company_legal_name');
  insert into public.notification_events(organization_id,event_key,event_type,company_id,module,obligation_id,payload,created_by)
    values(obligation.organization_id,h04_assignment_event.event_key,h04_assignment_event.event_type,obligation.company_id,obligation.module,obligation.id,v_payload,actor)
    on conflict on constraint notification_events_organization_id_event_key_key do nothing returning id into v_event;
  if v_event is null then return; end if;
  for v_recipient in select m.user_id from public.organization_members m join public.profiles p on p.user_id=m.user_id
    where m.organization_id=obligation.organization_id and m.active and m.deleted_at is null and p.enabled and p.deleted_at is null and p.provisioning_status='ready'
      and (m.is_admin or (m.user_id=obligation.delivery_responsible_id and private.has_permission(m.organization_id,m.user_id,obligation.company_id,obligation.module,'view'))) loop
    insert into public.notifications(organization_id,recipient_id,event_id,title,body,target_path,created_by)
      values(obligation.organization_id,v_recipient,v_event,v_payload->>'title',v_payload->>'body',v_payload->>'target_path',actor) on conflict do nothing;
  end loop;
end $$;
alter table public.rule_versions add constraint interval_values_required check(frequency<>'personalizada'
  or (interval_count is not null and interval_unit is not null and anchor_date is not null));
revoke all on function private.h04_assignment_event(public.obligations,uuid,text,text) from public,anon,authenticated;
