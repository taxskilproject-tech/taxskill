do $$ declare source text; begin
  select pg_get_functiondef('private.h07_validate(jsonb)'::regprocedure) into source;
  source:=replace(source,'''company_id'',''scope''','''indicator'',''company_id'',''scope''');
  source:=replace(source,'if coalesce(p_input->>''scope''', 'if (p_input->>''indicator'' is not null and p_input->>''indicator'' not in (''review'',''overdue'',''upcoming'',''observed'')) or coalesce(p_input->>''scope''');
  execute source;
  select pg_get_functiondef('private.h07_rows(uuid,uuid,jsonb,text)'::regprocedure) into source;
  source:=replace(source,'and (coalesce(p_input->>''report'',''detail'') in',
    'and (p_input->>''indicator'' is null or p_input->>''indicator''=''review'' and f.disposition=''active'' and f.review_files>0
      or p_input->>''indicator''=''observed'' and f.disposition=''active'' and f.observed_count>0
      or p_input->>''indicator''=''overdue'' and f.overdue
      or p_input->>''indicator''=''upcoming'' and f.disposition=''active'' and f.operational_due_date between (now() at time zone ''America/Lima'')::date
        and (now() at time zone ''America/Lima'')::date+(select coalesce((settings->>''upcoming_days'')::integer,7) from public.organizations where id=p_org))
    and (coalesce(p_input->>''report'',''detail'') in');
  execute source;
end $$;
