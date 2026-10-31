-- Solo se publica una prueba firmada de una acción fija; ninguna clave reutilizable viaja por pg_net.
create table private.sunat_dispatch_nonces (
 nonce uuid primary key,
 issued_at bigint not null,
 expires_at timestamptz not null,
 consumed_at timestamptz,
 created_at timestamptz not null default now()
);
create index h10_dispatch_nonces_expiry on private.sunat_dispatch_nonces(expires_at);
alter table private.sunat_dispatch_nonces enable row level security;
revoke all on private.sunat_dispatch_nonces from public,anon,authenticated,service_role;

create function public.h10_dispatch_consume_nonce(p_nonce uuid,p_issued_at bigint) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then perform private.fail('FORBIDDEN'); end if;
 update private.sunat_dispatch_nonces set consumed_at=clock_timestamp()
  where nonce=p_nonce and issued_at=p_issued_at and expires_at>clock_timestamp() and consumed_at is null;
 return found;
end $$;
revoke all on function public.h10_dispatch_consume_nonce(uuid,bigint) from public,anon,authenticated;
grant execute on function public.h10_dispatch_consume_nonce(uuid,bigint) to service_role;

create or replace function private.h10_cron_dispatch() returns bigint
language plpgsql security definer set search_path='' as $$
declare settings private.sunat_dispatch_settings; secret text; request_id bigint;
 token uuid:=gen_random_uuid(); issued bigint:=floor(extract(epoch from clock_timestamp()))::bigint;
 signature text; envelope jsonb;
begin
 select * into settings from private.sunat_dispatch_settings where id;
 if not settings.enabled then return null; end if;
 select decrypted_secret into secret from vault.decrypted_secrets where id=settings.secret_id;
 if secret is null then raise exception 'H10_DISPATCH_SECRET_UNAVAILABLE'; end if;
 delete from private.sunat_dispatch_nonces where expires_at<now()-interval '2 days';
 insert into private.sunat_dispatch_nonces(nonce,issued_at,expires_at)
  values(token,issued,clock_timestamp()+interval '90 seconds');
 signature:=encode(extensions.hmac('v1:'||token::text||':'||issued::text||':sunat.dispatch',secret,'sha256'),'hex');
 envelope:=jsonb_build_object('schema_version',1,'action','sunat.dispatch','nonce',token,'issued_at',issued);
 select net.http_post(url:=settings.endpoint,
  headers:=jsonb_build_object('Content-Type','application/json','X-TaxSkill-Signature',signature),
  body:=envelope,timeout_milliseconds:=10000) into request_id;
 update private.sunat_dispatch_settings set last_request_id=request_id where id;
 return request_id;
end $$;
