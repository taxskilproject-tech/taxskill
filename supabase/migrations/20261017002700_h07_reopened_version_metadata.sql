-- A reopened deliverable has no current version, but its old versions remain searchable.
do $$ declare source text; begin
  select pg_get_functiondef('private.h07_documents(uuid,uuid,jsonb)'::regprocedure) into source;
  source:=replace(source,'d.current_version_id=v.id is_current','coalesce(d.current_version_id=v.id,false) is_current');
  execute source;
end $$;
