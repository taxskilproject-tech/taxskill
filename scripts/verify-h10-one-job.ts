import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";

import { sunatDispatchTicketSchema } from "../src/features/sunat-mailbox/contracts/dispatch.schema";
import type { Database } from "../src/lib/supabase/types/database.types";
import { oneJobRuntimeSchema } from "./sunat-worker/contracts/runtime.schema";
import { loadH09LabEnvironment } from "./utils/h09-lab-environment";

async function main() {
  if (process.argv.length !== 2)
    throw new Error("LOCAL_TEST_ACCEPTS_NO_TARGET");
  const local = loadH09LabEnvironment();
  const privateSettings = parseEnv(
    readFileSync(".envs/local/sunat/service.env", "utf8"),
  );
  const runtime = oneJobRuntimeSchema.parse({
    SUNAT_CREDENTIALS_CURRENT_KEY:
      privateSettings.SUNAT_CREDENTIALS_CURRENT_KEY,
    SUNAT_CREDENTIALS_KEYS: privateSettings.SUNAT_CREDENTIALS_KEYS,
    SUPABASE_URL: "http://host.docker.internal:54431",
    SUPABASE_SECRET_KEY: local.SUPABASE_SECRET_KEY,
    SUNAT_WORKER_MODE: "simulator",
    SUNAT_SOURCE_VALIDATED: "false",
  });
  const directory = resolve(".envs/local/sunat/one-job-check");
  mkdirSync(directory, { recursive: true });
  const sql = `begin;
set local request.jwt.claims='{"role":"service_role"}';
do $$ declare conn public.sunat_connections; begin
 if exists(select 1 from public.sunat_jobs where state in ('queued','running')) then raise exception 'LOCAL_QUEUE_BUSY'; end if;
 select s.* into conn from public.sunat_connections s join public.companies c on c.id=s.company_id
 where c.ruc='20000000901' and s.state='connected' and s.deleted_at is null;
 if conn.id is null then raise exception 'LOCAL_FIXTURE_REQUIRED'; end if;
 perform private.h10_enqueue(conn,'monthly','one-job-'||gen_random_uuid()::text,null,null,
 date_trunc('month',now() at time zone 'America/Lima')::date,
 (date_trunc('month',now() at time zone 'America/Lima')+interval '1 month - 1 day')::date);
end $$;
select public.h10_dispatch_claim(false);
commit;`;
  const prepared = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_tax-skill-h09",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-Atq",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    {
      input: sql,
      encoding: "utf8",
      windowsHide: true,
    },
  );
  if (prepared.status !== 0) throw new Error("LOCAL_CLAIM_FAILED");
  const ticket = sunatDispatchTicketSchema.parse(
    JSON.parse(prepared.stdout.trim()),
  );
  writeFileSync(directory + "/claim.json", JSON.stringify(ticket.claim), {
    mode: 0o600,
  });
  writeFileSync(directory + "/runtime.json", JSON.stringify(runtime), {
    mode: 0o600,
  });
  const client = createClient<Database>(
    local.NEXT_PUBLIC_SUPABASE_URL,
    local.SUPABASE_SECRET_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const started = performance.now();
  const name = "taxskill-h10-run-one-check";
  const result = spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "--init",
      "--name",
      name,
      "--user",
      "pwuser",
      "--memory",
      "768m",
      "--cpus",
      "0.75",
      "--pids-limit",
      "256",
      "--shm-size",
      "256m",
      "--cap-drop",
      "ALL",
      "--read-only",
      "--tmpfs",
      "/tmp:rw,size=256m",
      "--mount",
      `type=bind,source=${resolve("node_modules")},target=/app/node_modules,readonly`,
      "--mount",
      `type=bind,source=${resolve(".sunat-worker-build")},target=/app/build,readonly`,
      "--mount",
      `type=bind,source=${directory},target=/private`,
      "--entrypoint",
      "timeout",
      "mcr.microsoft.com/playwright:v1.64.1-noble",
      "90s",
      "xvfb-run",
      "-a",
      "node",
      "/app/build/scripts/sunat-worker/run-one.js",
    ],
    { encoding: "utf8", windowsHide: true, timeout: 110000 },
  );
  const running = execFileSync(
    "docker",
    ["ps", "-q", "--filter", "name=^/" + name + "$"],
    { encoding: "utf8", windowsHide: true },
  ).trim();
  const finished = await client.rpc("h10_dispatch_finish", {
    p_run_id: ticket.run_id,
    p_error_code: result.status === 0 ? "" : "SANDBOX_EXECUTION_FAILED",
    p_stopped: running === "",
  });
  if (finished.error || !finished.data)
    throw new Error("LOCAL_DISPATCH_FINALIZATION_FAILED");
  if (result.error || result.status !== 0 || running)
    throw new Error("LOCAL_RUN_ONE_FAILED");
  const job = await client
    .from("sunat_jobs")
    .select("state,progress")
    .eq("id", ticket.claim.job.id)
    .single();
  if (job.error || job.data.state !== "complete")
    throw new Error("LOCAL_JOB_NOT_COMPLETE");
  if (
    existsSync(directory + "/claim.json") ||
    existsSync(directory + "/runtime.json")
  )
    throw new Error("PRIVATE_INPUT_NOT_REMOVED");
  writeFileSync(
    "docs/hitos/evidencias/h10-one-job.json",
    JSON.stringify(
      {
        recorded_at: new Date().toISOString(),
        environment: "isolated_docker_54431",
        terminal_state: job.data.state,
        progress: job.data.progress,
        duration_ms: Math.ceil(performance.now() - started),
        private_inputs_removed: true,
        container_stopped: true,
        global_lease_released: true,
        cloud_writes: false,
        live_sunat: false,
      },
      null,
      2,
    ) + "\n",
  );
  console.info(
    "H10: run-one completo en Docker; entradas privadas eliminadas y lease liberado.",
  );
}

main().catch((error: unknown) => {
  const code =
    error instanceof Error && /^[A-Z_]+$/.test(error.message)
      ? error.message
      : "INPUT_OR_RUNTIME_CONTRACT_FAILED";
  console.error("H10_ONE_JOB_CHECK_FAILED: " + code);
  process.exitCode = 1;
});
