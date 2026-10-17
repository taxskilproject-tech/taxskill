-- Fixes discovered by local SQL lint; applied migrations remain immutable.
do $$ declare source text; begin
  select pg_get_functiondef('public.h07_export(uuid,uuid,text,jsonb)'::regprocedure) into source;
  source:=replace(source,'result=result,completed_at','result=(saved.result||jsonb_build_object(''outcome'',p_input->>''outcome'')),completed_at');
  execute source;
  select pg_get_functiondef('private.h07_rows(uuid,uuid,jsonb,text)'::regprocedure) into source;
  source:=replace(source,'and (coalesce((p_input->>''include_deleted'')::boolean,false) or f.record_status=''active'')',
    'and (p_action<>''reports.export'' or private.h07_visible(p_org,p_actor,f.company_id,f.module,''reports.view'',coalesce((p_input->>''include_deleted'')::boolean,false)))
    and (coalesce((p_input->>''include_deleted'')::boolean,false) or f.record_status=''active'')');
  execute source;
end $$;

-- An active company with no obligations still counts as an active company.
do $$ declare source text; begin
  select pg_get_functiondef('private.h07_report(uuid,uuid,jsonb,text)'::regprocedure) into source;
  source:=replace(source,'''companies'',count(distinct company_id) filter(where record_status=''active'')',
    '''companies'',(select count(*) from public.companies c where c.organization_id=p_org and c.deleted_at is null and c.status=''active''
      and coalesce(p_input->>''scope'',''all'')<>''internal'' and (p_input->>''company_id'' is null or c.id=(p_input->>''company_id'')::uuid)
      and exists(select 1 from public.permissions pm where pm.organization_id=p_org and (p_input->>''module'' is null or pm.module=p_input->>''module'')
        and private.h07_visible(p_org,p_actor,c.id,pm.module,p_action,false)))');
  execute source;
end $$;
