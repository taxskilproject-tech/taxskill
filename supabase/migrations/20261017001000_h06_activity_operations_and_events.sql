-- Reuse transactional document operations and materialize only eligible audiences.
alter table public.notification_events drop constraint notification_events_event_type_check;
alter table public.notification_events add constraint notification_events_event_type_check check(event_type in ('assigned','reassigned','upload_finalized','observed','approved','reopened','due_soon','due_today','overdue','assignment_issue','contact_issue','integration_issue'));
alter table public.notifications drop constraint notifications_target_path_check;
alter table public.notifications add constraint notifications_target_path_check check(target_path ~ '^/actividades/[0-9a-f-]{36}$' or target_path='/configuracion');
create index notification_recipient_unread on public.notifications(organization_id,recipient_id,created_at desc) where read_at is null;
create index notification_event_obligation on public.notification_events(organization_id,obligation_id,created_at desc);

create function private.h06_visible(p_org uuid,p_actor uuid,p_company uuid,p_module text) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.organization_members m join public.profiles p on p.user_id=m.user_id join public.organizations o on o.id=m.organization_id
    where m.organization_id=p_org and m.user_id=p_actor and m.active and m.deleted_at is null and p.enabled and p.deleted_at is null and p.provisioning_status='ready'
      and o.status='active' and o.deleted_at is null
      and (p_company is not null and exists(select 1 from public.companies c where c.id=p_company and c.organization_id=p_org and c.deleted_at is null)
        or p_company is null and p_module='actividades' and m.member_type='internal')
      and (m.is_admin or private.has_permission(p_org,p_actor,p_company,p_module,'view')));
$$;
create function private.h06_operational(p_obligation public.obligations) returns boolean
language sql stable security definer set search_path='' as $$
  select p_obligation.disposition='active' and exists(select 1 from public.organizations o where o.id=p_obligation.organization_id and o.deleted_at is null and o.status='active')
    and (p_obligation.company_id is null or exists(select 1 from public.companies c where c.id=p_obligation.company_id and c.deleted_at is null and c.status='active'))
    and (p_obligation.employment_period_id is null or exists(select 1 from public.employment_periods e join public.workers w on w.id=e.worker_id where e.id=p_obligation.employment_period_id and w.deleted_at is null));
$$;
create or replace function private.document_access(org uuid,obligation uuid,actor uuid,action_name text) returns public.obligations
language plpgsql security definer set search_path='' as $$
declare v_result public.obligations;
begin
  perform private.assert_member(org,actor);
  select * into v_result from public.obligations where organization_id=org and id=obligation;
  if v_result.id is null or not private.h06_visible(org,actor,v_result.company_id,v_result.module)
    or (action_name<>'view' and not private.has_permission(org,actor,v_result.company_id,v_result.module,action_name)) then perform private.fail('NOT_FOUND'); end if;
  return v_result;
end $$;

create function private.h06_event(p_obligation public.obligations,p_actor uuid,p_type text,p_key text,p_review uuid default null,p_cycle uuid default null,p_threshold integer default null) returns void
language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_payload jsonb; v_recipient uuid; v_due date; v_body text;
begin
  if not private.h06_operational(p_obligation) and p_type not in ('approved') then return; end if;
  select due_date into v_due from public.submission_cycles where id=p_cycle;
  v_body:=case p_type when 'upload_finalized' then 'Hay un archivo recibido para revisión.' when 'observed' then 'Un archivo requiere corrección. Consulta el detalle.'
    when 'reopened' then 'Un archivo requiere una nueva entrega.' when 'approved' then 'Un archivo fue aprobado.' when 'assignment_issue' then 'El responsable necesita reasignación.'
    when 'due_soon' then 'Tienes una entrega próxima a vencer.' when 'due_today' then 'Tienes una entrega que vence hoy.' when 'overdue' then 'Tienes una entrega vencida.'
    when 'reassigned' then 'Se te asignó la entrega de esta actividad.' else 'Tienes una obligación asignada.' end;
  v_payload:=jsonb_build_object('schema_version',1,'title',p_obligation.title,'body',v_body,'target_path','/actividades/'||p_obligation.id,'priority',p_obligation.priority,
    'due_date',coalesce(v_due,p_obligation.initial_due_date),'scope_label',coalesce(p_obligation.snapshot->'destination'->>'company_legal_name','Interna del estudio'));
  insert into public.notification_events(organization_id,event_key,event_type,company_id,module,obligation_id,cycle_id,review_event_id,threshold_days,payload,created_by)
    values(p_obligation.organization_id,p_key,p_type,p_obligation.company_id,p_obligation.module,p_obligation.id,p_cycle,p_review,p_threshold,v_payload,p_actor)
    on conflict(organization_id,event_key) do nothing returning id into v_id;
  if v_id is null then return; end if;
  for v_recipient in select m.user_id from public.organization_members m
    where m.organization_id=p_obligation.organization_id and private.h06_visible(m.organization_id,m.user_id,p_obligation.company_id,p_obligation.module)
      and case when p_type='assignment_issue' then m.is_admin
        when p_type='upload_finalized' then private.has_permission(m.organization_id,m.user_id,p_obligation.company_id,p_obligation.module,'approve') or private.has_permission(m.organization_id,m.user_id,p_obligation.company_id,p_obligation.module,'observe')
        else m.user_id=p_obligation.delivery_responsible_id and private.has_permission(m.organization_id,m.user_id,p_obligation.company_id,p_obligation.module,'upload') end loop
    insert into public.notifications(organization_id,recipient_id,event_id,title,body,target_path,created_by)
      values(p_obligation.organization_id,v_recipient,v_id,v_payload->>'title',v_body,v_payload->>'target_path',p_actor) on conflict do nothing;
  end loop;
end $$;
create or replace function private.document_event(obligation public.obligations,actor uuid,p_event_type text,p_event_key text,review_id uuid default null,cycle uuid default null) returns void
language sql security definer set search_path='' as $$ select private.h06_event(obligation,actor,p_event_type,p_event_key,review_id,cycle); $$;
create or replace function private.h04_assignment_event(obligation public.obligations,actor uuid,event_type text,event_key text) returns void
language sql security definer set search_path='' as $$ select private.h06_event(obligation,actor,event_type,event_key); $$;

create function private.h06_notice_integrity() returns trigger language plpgsql set search_path='' as $$
declare v_obligation public.obligations;
begin
  if tg_table_name='notifications' then
    if tg_op='UPDATE' and (to_jsonb(new)-array['read_at','updated_at','updated_by','revision']) is distinct from (to_jsonb(old)-array['read_at','updated_at','updated_by','revision']) then perform private.fail('FORBIDDEN'); end if;
    return new;
  end if;
  if new.obligation_id is not null then
    select * into v_obligation from public.obligations where id=new.obligation_id and organization_id=new.organization_id;
    if new.company_id is distinct from v_obligation.company_id or new.module is distinct from v_obligation.module then perform private.fail('VALIDATION_ERROR'); end if;
    if new.cycle_id is not null and not exists(select 1 from public.submission_cycles c join public.deliverables d on d.id=c.deliverable_id where c.id=new.cycle_id and d.obligation_id=v_obligation.id) then perform private.fail('VALIDATION_ERROR'); end if;
    if new.review_event_id is not null and not exists(select 1 from public.review_events r join public.deliverables d on d.id=r.deliverable_id where r.id=new.review_event_id and d.obligation_id=v_obligation.id) then perform private.fail('VALIDATION_ERROR'); end if;
  end if;
  if new.event_type in ('due_soon','due_today','overdue') and (new.cycle_id is null or not coalesce(new.threshold_days=any(array[7,3,1,0,-1]),false)
    or new.event_type<>case when new.threshold_days=-1 then 'overdue' when new.threshold_days=0 then 'due_today' else 'due_soon' end) then perform private.fail('VALIDATION_ERROR'); end if;
  return new;
end $$;
create trigger h06_event_integrity before insert on public.notification_events for each row execute function private.h06_notice_integrity();
create trigger h06_notice_immutable_content before update on public.notifications for each row execute function private.h06_notice_integrity();
create trigger h06_event_history before update or delete on public.notification_events for each row execute function private.keep_document_history();
create trigger h06_notice_history before delete on public.notifications for each row execute function private.keep_document_history();

create function private.h06_create_additional(p_org uuid,p_actor uuid,p_request uuid,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_rule public.requirement_rules; v_config public.rule_versions; v_period jsonb; v_result jsonb; v_id uuid; v_due date:=(p_input->>'due_date')::date;
  v_today date:=(now() at time zone 'America/Lima')::date; v_company uuid:=(p_input->>'company_id')::uuid; v_responsible uuid:=(p_input->>'delivery_responsible_id')::uuid;
  v_formats text[]:=array(select jsonb_array_elements_text(p_input->'allowed_formats')); v_maximum bigint:=(p_input->>'max_file_bytes')::bigint;
begin
  perform private.assert_member(p_org,p_actor,true);
  if p_input->>'id' is not null or nullif(btrim(p_input->>'title'),'') is null or length(p_input->>'title')>150 or length(coalesce(p_input->>'description',''))>4000
    or (v_company is not null and not exists(select 1 from public.companies where organization_id=p_org and id=v_company and status='active' and deleted_at is null))
    or v_responsible is null or not private.has_permission(p_org,v_responsible,v_company,'actividades','upload')
    or not private.valid_specs(p_input->'deliverable_specs',v_formats,v_maximum) or not private.valid_formats(v_formats) or v_maximum not between 1 and 50000000
    or jsonb_array_length(p_input->'deliverable_specs')>20 then perform private.fail('VALIDATION_ERROR'); end if;
  if coalesce(p_input->>'frequency','unica')<>'unica' then
    if p_input->>'frequency'='eventual' then perform private.fail('VALIDATION_ERROR'); end if;
    v_result:=private.h04_configure(p_org,p_actor,p_request,p_input||jsonb_build_object('class','additional','inherit_responsible',false,'active',true,'document_type_id',null,'module','actividades'));
    return private.h04_generate((v_result->>'resource_id')::uuid,p_actor,p_request,v_today,50)||jsonb_build_object('rule_id',v_result->>'resource_id');
  end if;
  if v_due is null or v_due<v_today then perform private.fail('VALIDATION_ERROR'); end if;
  v_rule:=jsonb_populate_record(null::public.requirement_rules,jsonb_build_object('organization_id',p_org,'class','additional','module','actividades','company_id',v_company,'title',btrim(p_input->>'title'),'description',p_input->>'description'));
  v_config:=jsonb_populate_record(null::public.rule_versions,p_input||jsonb_build_object('frequency','unica','anchor_date',v_due,'deadline_offset_days',0,'is_required',true,'priority',coalesce(p_input->>'priority','media'),
    'applicability_conditions','{"schema_version":1,"employment_stage":"any","event_types":[],"termination_reasons":[]}'::jsonb,
    'configuration_snapshot',jsonb_build_object('title',btrim(p_input->>'title'),'description',p_input->>'description','delivery_responsible_id',v_responsible,'inherit_responsible',false)));
  v_period:=private.h04_calendar('unica',v_today,v_due,null,null,p_request::text);
  v_id:=private.h04_emit(v_rule,v_config,v_period,jsonb_build_object('destination_key',case when v_company is null then 'organization:'||p_org else 'company:'||v_company end,'applicable',true),p_actor,p_request);
  perform private.h04_audit(p_org,p_actor,p_request,'CreateAdditionalActivity','obligations',v_id,null,jsonb_build_object('title',p_input->>'title','priority',p_input->>'priority'));
  return jsonb_build_object('schema_version',1,'resource_id',v_id,'obligation_id',v_id,'revision',0,'status','completed');
end $$;

alter function private.document_command(uuid,uuid,uuid,text,jsonb) rename to document_command_h05;
create function private.document_command(org uuid,actor uuid,req uuid,op text,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_notice public.notifications; v_rule public.requirement_rules; v_result jsonb;
begin
  if op='CreateAdditionalActivity' then return private.h06_create_additional(org,actor,req,input); end if;
  if op='ConfigureAdditionalRequirement' then return private.h04_configure(org,actor,req,input||jsonb_build_object('class','additional','document_type_id',null,'module','actividades')); end if;
  if op='MarkNotificationRead' then
    select n.* into v_notice from public.notifications n join public.notification_events e on e.id=n.event_id
      where n.organization_id=org and n.id=(input->>'notification_id')::uuid and n.recipient_id=actor
        and (e.obligation_id is null and exists(select 1 from public.organization_members m where m.organization_id=org and m.user_id=actor and m.is_admin and m.active and m.deleted_at is null)
          or e.obligation_id is not null and private.h06_visible(org,actor,e.company_id,e.module)) for update of n;
    if v_notice.id is null then perform private.fail('NOT_FOUND'); end if;
    if v_notice.read_at is null then update public.notifications set read_at=now(),updated_at=now(),updated_by=actor,revision=revision+1 where id=v_notice.id; end if;
    return jsonb_build_object('schema_version',1,'resource_id',v_notice.id,'revision',(select revision from public.notifications where id=v_notice.id),'status','completed');
  end if;
  if op='SetRuleActive' then
    select * into v_rule from public.requirement_rules where organization_id=org and id=(input->>'rule_id')::uuid and class='additional';
    if v_rule.id is not null then
      perform private.assert_member(org,actor,true);
      if v_rule.deleted_at is not null then perform private.fail('NOT_FOUND'); end if;
      if (input->>'expected_revision')::integer is distinct from v_rule.revision then perform private.fail('CONFLICT'); end if;
      if coalesce((input->>'active')::boolean,false) and not private.has_permission(org,v_rule.delivery_responsible_id,v_rule.company_id,'actividades','upload') then perform private.fail('VALIDATION_ERROR'); end if;
      if nullif(btrim(input->>'reason'),'') is null then perform private.fail('VALIDATION_ERROR'); end if;
      update public.requirement_rules set active=(input->>'active')::boolean,operation_pauses=private.pause_intervals(operation_pauses,not (input->>'active')::boolean,'rule_paused',input->>'reason',actor),revision=revision+1,updated_at=now(),updated_by=actor where id=v_rule.id;
      perform private.h04_audit(org,actor,req,op,'requirement_rules',v_rule.id,to_jsonb(v_rule),(select to_jsonb(r) from public.requirement_rules r where id=v_rule.id));
      return jsonb_build_object('schema_version',1,'resource_id',v_rule.id,'revision',v_rule.revision+1,'status','completed');
    end if;
  end if;
  return private.document_command_h05(org,actor,req,op,input);
end $$;

create function public.h06_run_deadlines(p_today date default (now() at time zone 'America/Lima')::date) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_obligation public.obligations; v_cycle record; v_issue boolean; v_count integer:=0;
begin
  if auth.role() is distinct from 'service_role' and session_user<>'postgres' then perform private.fail('FORBIDDEN'); end if;
  if p_today is null then perform private.fail('VALIDATION_ERROR'); end if;
  for v_obligation in select o.* from public.obligations o where private.h06_operational(o) order by o.organization_id,o.id loop
    v_issue:=v_obligation.delivery_responsible_id is null or not private.has_permission(v_obligation.organization_id,v_obligation.delivery_responsible_id,v_obligation.company_id,v_obligation.module,'upload');
    if v_obligation.assignment_issue is distinct from v_issue then update public.obligations set assignment_issue=v_issue,revision=revision+1,updated_at=now(),updated_by=null where id=v_obligation.id; end if;
    if v_issue then perform private.h06_event(v_obligation,null,'assignment_issue','assignment_issue:'||v_obligation.id||':'||coalesce(v_obligation.delivery_responsible_id::text,'none')||':'||v_obligation.revision); continue; end if;
    for v_cycle in select c.id,c.due_date from public.submission_cycles c join public.deliverables d on d.id=c.deliverable_id where d.obligation_id=v_obligation.id and c.state='open' and c.first_submitted_at is null and c.due_date-p_today=any(array[7,3,1,0,-1]) loop
      perform private.h06_event(v_obligation,null,case when v_cycle.due_date<p_today then 'overdue' when v_cycle.due_date=p_today then 'due_today' else 'due_soon' end,
        'deadline:'||v_cycle.id||':'||(v_cycle.due_date-p_today),null,v_cycle.id,v_cycle.due_date-p_today); v_count:=v_count+1;
    end loop;
  end loop;
  return jsonb_build_object('status','completed','examined_thresholds',v_count);
end $$;
revoke all on function public.h06_run_deadlines(date) from public,anon,authenticated;
grant execute on function public.h06_run_deadlines(date) to service_role;
do $$ declare v_proc record; begin
  for v_proc in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname like 'h06_%' loop
    execute format('revoke all on function %s from public,anon,authenticated',v_proc.signature);
  end loop;
end $$;
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then alter publication supabase_realtime add table public.notifications; end if;
end $$;
