-- Activities uses the same operative facts and documentary denominator as reports.
do $$ declare source text; begin
  select pg_get_functiondef('private.h06_inbox(uuid,uuid,jsonb)'::regprocedure) into source;
  source:=replace(source,'from public.h03_obligation_summary s where s.organization_id=p_org',
    'from private.h07_facts s where s.record_status=''active'' and s.organization_id=p_org');
  source:=replace(source,'class=''documentary'' and disposition=''active'' and is_required','required');
  execute source;
end $$;
