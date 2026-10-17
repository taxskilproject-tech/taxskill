do $$ declare source text; begin
  select pg_get_functiondef('public.h07_export(uuid,uuid,text,jsonb)'::regprocedure) into source;
  source:=replace(source,'(result->''filters''-''q'')','((result->''filters'')-''q'')');
  execute source;
end $$;
