-- Staging maintenance has its own server credential; no file access policies are added.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create function public.h03_schedule_cleanup(p_base_url text,p_cleanup_secret text) returns void
language plpgsql security definer set search_path='' as $$
declare secret_id uuid; job text;
begin
  if auth.role()<>'service_role' then perform private.fail('FORBIDDEN'); end if;
  if p_base_url !~ '^https://[a-z0-9]{20}\.supabase\.co$' or length(p_cleanup_secret)<32 then perform private.fail('VALIDATION_ERROR'); end if;
  select id into secret_id from vault.secrets where name='h03_cleanup_secret';
  if secret_id is null then perform vault.create_secret(p_cleanup_secret,'h03_cleanup_secret','H03 staging cleanup only');
  else perform vault.update_secret(secret_id,p_cleanup_secret); end if;
  job := format('select net.http_post(url := %L, headers := jsonb_build_object(''Content-Type'',''application/json'',''x-cleanup-key'',(select decrypted_secret from vault.decrypted_secrets where name=''h03_cleanup_secret'')), body := ''{"action":"cleanup"}''::jsonb, timeout_milliseconds := 10000);',p_base_url||'/functions/v1/document-operations');
  perform cron.schedule('h03-staging-cleanup','17 * * * *',job);
end $$;
revoke all on function public.h03_schedule_cleanup(text,text) from public,anon,authenticated;
grant execute on function public.h03_schedule_cleanup(text,text) to service_role;
