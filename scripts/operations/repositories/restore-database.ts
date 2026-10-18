import { spawnSync } from "node:child_process";

import type { RecoveryDatabase } from "../types/recovery.types";

export function assertRestoreTarget(target: RecoveryDatabase): void {
  if (
    !/^supabase_db_tax-skill-h08-restore-[a-z0-9-]+$/.test(target.container) ||
    !/^http:\/\/127\.0\.0\.1:54561\/?$/.test(target.url)
  )
    throw new Error(
      "Restauración bloqueada: se requiere el proyecto Docker aislado H08, nunca Cloud ni la base local principal.",
    );
}
export function restoreProcess(
  target: RecoveryDatabase,
  command: string,
  args: readonly string[],
  input?: Buffer,
): Buffer {
  assertRestoreTarget(target);
  const result = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      target.container,
      command,
      "-U",
      "supabase_admin",
      "-d",
      "postgres",
      ...args,
    ],
    { input, maxBuffer: 64 * 1024 * 1024, windowsHide: true },
  );
  if (result.error || result.status !== 0)
    throw new Error(
      "La operación de recuperación aislada no pudo completarse.",
    );
  return result.stdout;
}
export function restoreQuery(target: RecoveryDatabase, sql: string): string {
  return restoreProcess(target, "psql", ["-v", "ON_ERROR_STOP=1", "-Atc", sql])
    .toString("utf8")
    .trim();
}
export function validateRestoredRelations(target: RecoveryDatabase): void {
  restoreQuery(
    target,
    `do $$ declare c record; conditions text; populated text; invalid boolean; begin
    for c in select x.*,n.nspname child_schema,t.relname child_table,pn.nspname parent_schema,p.relname parent_table
      from pg_constraint x join pg_class t on t.oid=x.conrelid join pg_namespace n on n.oid=t.relnamespace
      join pg_class p on p.oid=x.confrelid join pg_namespace pn on pn.oid=p.relnamespace
      where x.contype='f' and n.nspname in ('public','private','auth') loop
      select string_agg(format('child.%I=parent.%I',a.attname,b.attname),' and '),string_agg(format('child.%I is not null',a.attname),' and ')
        into conditions,populated from unnest(c.conkey,c.confkey) as k(child_key,parent_key)
        join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.child_key
        join pg_attribute b on b.attrelid=c.confrelid and b.attnum=k.parent_key;
      execute format('select exists(select 1 from %I.%I child where %s and not exists(select 1 from %I.%I parent where %s))',
        c.child_schema,c.child_table,populated,c.parent_schema,c.parent_table,conditions) into invalid;
      if invalid then raise exception 'INTEGRITY_FAILED'; end if;
    end loop;
  end $$;`,
  );
}
