create function private.h07_documents(p_org uuid,p_actor uuid,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  with facts as materialized(select * from private.h07_rows(p_org,p_actor,p_input-'q','view')),
  rows as(select v.id,v.original_name,v.extension,v.validated_bytes,v.finalized_at,v.version_number,
    f.id obligation_id,f.company_id,f.scope_name company_name,f.module,f.title,f.worker_name,f.worker_identity,
    f.occurrence_key period,f.document_type,f.aggregate_state state,f.record_status,
    d.current_version_id=v.id is_current from facts f join public.deliverables d on d.obligation_id=f.id
    join public.document_versions v on v.deliverable_id=d.id
    where coalesce(p_input->>'q','')='' or position(lower(p_input->>'q') in lower(concat_ws(' ',v.original_name,f.title,f.scope_name,f.ruc,f.worker_name,f.worker_identity,f.document_type,f.occurrence_key)))>0)
  select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from rows order by finalized_at desc,id
    offset (coalesce((p_input->>'page')::integer,1)-1)*coalesce((p_input->>'pageSize')::integer,25) limit coalesce((p_input->>'pageSize')::integer,25)) r),'[]'),
    'count',(select count(*) from rows),'queried_at',statement_timestamp()) into result;
  return result;
end $$;

create function private.h07_audit(p_org uuid,p_actor uuid,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  with scoped as(select a.*,coalesce(a.company_id,case when a.resource_table='companies' then a.resource_id end,o.company_id) effective_company,
    coalesce(a.module,o.module) effective_module from public.audit_events a
    left join public.obligations o on o.id=a.resource_id and a.resource_table='obligations' and o.organization_id=a.organization_id where a.organization_id=p_org),
  visible as(select a.id,a.actor_kind,a.actor_user_id,coalesce(p.full_name,a.system_actor,'Sistema') actor_name,
    a.effective_company company_id,c.legal_name company_name,a.effective_module module,a.action,a.resource_table,a.resource_id,a.created_at,
    -- Deliberately expose only state transitions, never raw metadata, salaries, medical details or network identifiers.
    (select coalesce(jsonb_object_agg(key,value),'{}') from jsonb_each(coalesce(a.before_values,'{}')) where key in ('status','enabled','active','revision','deleted_at','disposition','review_state','due_date','start_date','end_date')) before_values,
    (select coalesce(jsonb_object_agg(key,value),'{}') from jsonb_each(coalesce(a.after_values,'{}')) where key in ('status','enabled','active','revision','deleted_at','disposition','review_state','due_date','start_date','end_date')) after_values,
    jsonb_build_object('outcome',a.metadata->>'outcome','format',a.metadata->>'format','row_count',a.metadata->'row_count','filter_summary',a.metadata->'filter_summary') metadata,
    case when c.deleted_at is not null then 'deleted' when c.status is not null and c.status<>'active' then 'inactive' else 'active' end record_status
    from scoped a left join public.profiles p on p.user_id=a.actor_user_id left join public.companies c on c.id=a.effective_company
    where (exists(select 1 from public.organization_members m where m.organization_id=p_org and m.user_id=p_actor and m.is_admin)
      or a.effective_module is not null and private.h07_visible(p_org,p_actor,a.effective_company,a.effective_module,'audit.view',false))
      and (p_input->>'company_id' is null or a.effective_company=(p_input->>'company_id')::uuid)
      and (coalesce(p_input->>'scope','all')<>'internal' or a.effective_company is null)
      and (coalesce(p_input->>'scope','all')<>'company' or a.effective_company is not null)
      and (p_input->>'module' is null or a.effective_module=p_input->>'module')
      and (p_input->>'actor_id' is null or a.actor_user_id=(p_input->>'actor_id')::uuid)
      and (p_input->>'resource' is null or a.resource_table=p_input->>'resource')
      and (p_input->>'action' is null or a.action=p_input->>'action')
      and (p_input->>'from' is null or a.created_at>=((p_input->>'from')::date::timestamp at time zone 'America/Lima'))
      and (p_input->>'to' is null or a.created_at<(((p_input->>'to')::date+1)::timestamp at time zone 'America/Lima'))
      and (p_input->>'period' is null or to_char(a.created_at at time zone 'America/Lima','YYYY-MM')=p_input->>'period')
      and (coalesce((p_input->>'include_deleted')::boolean,false) or c.deleted_at is null and (c.status is null or c.status='active')))
  select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from visible order by created_at desc,id
    offset (coalesce((p_input->>'page')::integer,1)-1)*coalesce((p_input->>'pageSize')::integer,25) limit coalesce((p_input->>'pageSize')::integer,25)) r),'[]'),
    'count',(select count(*) from visible),'queried_at',statement_timestamp()) into result;
  return result;
end $$;

create function public.h07_query(p_organization_id uuid,p_resource text,p_input jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare member public.organization_members; result jsonb;
begin
  member:=private.assert_member(p_organization_id,auth.uid()); perform private.admit_session(p_organization_id); perform private.h07_validate(p_input);
  if coalesce((p_input->>'include_deleted')::boolean,false) and not member.is_admin then perform private.fail('FORBIDDEN'); end if;
  if p_resource in ('dashboard','report') then
    result:=private.h07_report(p_organization_id,auth.uid(),p_input,case when p_resource='dashboard' then 'view' else 'reports.view' end);
  elsif p_resource='documents' then result:=private.h07_documents(p_organization_id,auth.uid(),p_input);
  elsif p_resource='audit' then result:=private.h07_audit(p_organization_id,auth.uid(),p_input);
  else perform private.fail('VALIDATION_ERROR'); end if;
  return jsonb_build_object('ok',true,'data',result);
exception when others then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',case when sqlstate='P0001' and sqlerrm in ('FORBIDDEN','NOT_FOUND','UNAUTHENTICATED') then sqlerrm else 'VALIDATION_ERROR' end));
end $$;

create function public.h07_export(p_organization_id uuid,p_request_id uuid,p_stage text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare member public.organization_members; saved public.operation_requests; filters jsonb; report jsonb; result jsonb; fingerprint text;
begin
  member:=private.assert_member(p_organization_id,auth.uid()); perform private.admit_session(p_organization_id);
  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text||auth.uid()::text||p_request_id::text,0));
  select * into saved from public.operation_requests where organization_id=p_organization_id and actor_user_id=auth.uid() and request_id=p_request_id and operation='GenerateReport' for update;
  if p_stage='start' then
    filters:=coalesce(p_input->'filters','{}')-'page'-'pageSize'; perform private.h07_validate(filters);
    if p_input->>'format' not in ('xlsx','pdf') or p_input->>'format' is null then perform private.fail('VALIDATION_ERROR'); end if;
    if coalesce((filters->>'include_deleted')::boolean,false) and not member.is_admin then perform private.fail('FORBIDDEN'); end if;
    fingerprint:=encode(extensions.digest((filters||jsonb_build_object('format',p_input->>'format'))::text,'sha256'),'hex');
    if saved.id is not null then
      if saved.input_hash<>fingerprint then perform private.fail('CONFLICT'); end if;
      return jsonb_build_object('ok',true,'data',saved.result);
    end if;
    report:=private.h07_report(p_organization_id,auth.uid(),filters,'reports.export');
    if not member.is_admin and not exists(select 1 from public.permissions pm where pm.organization_id=p_organization_id and pm.action='reports.export'
      and exists(select 1 from public.access_grants g join public.organization_members m on m.id=g.member_id
        where g.organization_id=p_organization_id and m.user_id=auth.uid() and private.has_permission(p_organization_id,auth.uid(),g.company_id,g.module,'reports.export')
        and private.has_permission(p_organization_id,auth.uid(),g.company_id,g.module,'reports.view'))) then perform private.fail('FORBIDDEN'); end if;
    result:=jsonb_build_object('filters',filters,'format',p_input->>'format','count',report->'count','fingerprint',report->>'fingerprint','outcome','started');
    insert into public.operation_requests(organization_id,request_id,actor_user_id,actor_key,operation,input_hash,status,result,created_by)
      values(p_organization_id,p_request_id,auth.uid(),auth.uid()::text,'GenerateReport',fingerprint,'processing',result,auth.uid());
  elsif p_stage='finish' then
    if saved.id is null then perform private.fail('NOT_FOUND'); end if;
    if p_input->>'outcome' not in ('generated','cancelled','failed') or p_input->>'outcome' is null then perform private.fail('VALIDATION_ERROR'); end if;
    if saved.status='completed' then
      if saved.result->>'outcome'<>p_input->>'outcome' then perform private.fail('CONFLICT'); end if;
      return jsonb_build_object('ok',true,'data',saved.result);
    end if;
    if p_input->>'outcome'='generated' then
      report:=private.h07_report(p_organization_id,auth.uid(),saved.result->'filters','reports.export');
      if report->>'fingerprint'<>saved.result->>'fingerprint' or (p_input->>'row_count')::integer<>(saved.result->>'count')::integer
        or p_input->>'row_count' is null then perform private.fail('CONFLICT'); end if;
    end if;
    result:=saved.result||jsonb_build_object('outcome',p_input->>'outcome');
    update public.operation_requests set status='completed',result=result,completed_at=now(),updated_by=auth.uid() where id=saved.id;
    insert into public.audit_events(organization_id,actor_kind,actor_user_id,company_id,module,action,resource_table,resource_id,request_id,metadata,created_by)
      values(p_organization_id,'user',auth.uid(),(result->'filters'->>'company_id')::uuid,result->'filters'->>'module','GenerateReport','operation_requests',saved.id,p_request_id,
        jsonb_build_object('outcome',p_input->>'outcome','format',result->>'format','row_count',case when p_input->>'outcome'='generated' then result->'count' else '0'::jsonb end,
          'filter_summary',(result->'filters'-'q')||jsonb_build_object('has_search',length(coalesce(result->'filters'->>'q',''))>0)),auth.uid());
  else perform private.fail('VALIDATION_ERROR'); end if;
  return jsonb_build_object('ok',true,'data',result);
exception when others then return jsonb_build_object('ok',false,'error',jsonb_build_object('code',case when sqlstate='P0001' and sqlerrm in ('FORBIDDEN','NOT_FOUND','UNAUTHENTICATED','CONFLICT') then sqlerrm else 'VALIDATION_ERROR' end));
end $$;

revoke all on function private.h07_documents(uuid,uuid,jsonb),private.h07_audit(uuid,uuid,jsonb),
  public.h07_query(uuid,text,jsonb),public.h07_export(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.h07_query(uuid,text,jsonb),public.h07_export(uuid,uuid,text,jsonb) to authenticated;
