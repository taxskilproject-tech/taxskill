import { randomUUID } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseEnv } from "node:util";

import { runSupabase } from "../../utils/run-supabase";
import type {
  RecoveryDatabase,
  RecoveryProjectKind,
} from "../types/recovery.types";

export function prepareRecoveryProject(kind: RecoveryProjectKind) {
  const project = `tax-skill-h08-${kind}-${randomUUID().slice(0, 8)}`;
  const root = resolve("test-results/local/h08", project);
  const supabase = join(root, "supabase");
  mkdirSync(supabase, { recursive: true });
  const portPrefix = kind === "source" ? "5455" : "5456";
  const inspector = kind === "source" ? 8186 : 8187;
  const config = readFileSync("supabase/config.toml", "utf8")
    .replace(/project_id = "tax-skill"/, `project_id = "${project}"`)
    .replace(/5433([0-9])/g, portPrefix + "$1")
    .replace(
      "# [edge_runtime.secrets]",
      `[edge_runtime.secrets]\nH03_PUBLIC_SUPABASE_URL = "http://127.0.0.1:${portPrefix}1"`,
    )
    .replace("inspector_port = 8183", `inspector_port = ${inspector}`);
  writeFileSync(join(supabase, "config.toml"), config);
  for (const folder of ["migrations", "tests", "functions"])
    cpSync(join("supabase", folder), join(supabase, folder), {
      recursive: true,
    });
  cpSync("supabase/seed.sql", join(supabase, "seed.sql"));
  // Edge's bundle includes these shared contracts, including type-only imports.
  for (const file of [
    "src/lib/supabase/types/database.types.ts",
    "src/domain/integrations/contracts/whatsapp.schema.ts",
  ]) {
    const destination = join(root, file);
    mkdirSync(resolve(destination, ".."), { recursive: true });
    cpSync(file, destination);
  }
  return { project, root, kind };
}
export function startRecoveryProject(root: string, kind: RecoveryProjectKind) {
  const excluded =
    "studio,pgmeta,inbucket,logflare,vector" +
    (kind === "restore" ? ",edge-runtime" : "");
  runSupabase(["start", "--workdir", root, "--exclude", excluded]);
  const status = parseEnv(
    runSupabase(["status", "--workdir", root, "--output", "env"]),
  );
  return {
    url: status.API_URL ?? "",
    secret: status.SECRET_KEY || status.SERVICE_ROLE_KEY || "",
    publicKey: status.PUBLISHABLE_KEY || status.ANON_KEY || "",
  };
}
export function assertRecoverySource(target: RecoveryDatabase): void {
  if (
    !/^supabase_db_tax-skill-h08-source-[a-z0-9-]+$/.test(target.container) ||
    target.url !== "http://127.0.0.1:54551"
  )
    throw new Error(
      "La fuente ficticia de recuperación debe ser el proyecto Docker H08 aislado.",
    );
}
