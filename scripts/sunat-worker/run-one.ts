import { readFileSync, statSync, unlinkSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import { parseSunatKeyring } from "../../src/features/sunat-mailbox/services/credentials-crypto.server";
import type { Database } from "../../src/lib/supabase/types/database.types";
import { oneJobRuntimeSchema } from "./contracts/runtime.schema";
import { claimedJobSchema } from "./contracts/worker.schema";
import { runClaimedSunatJob } from "./services/run-job";
import { SimulatorSunatSource } from "./source/simulator-source";
import { OfficialSunatSource } from "./source/sunat-source";

function readPrivateInput(filename: string): unknown {
  if (statSync(filename).size > 262144)
    throw new Error("WORKER_INPUT_TOO_LARGE");
  const content = readFileSync(filename, "utf8");
  unlinkSync(filename);
  return JSON.parse(content);
}

async function main() {
  const environment = oneJobRuntimeSchema.parse(
    readPrivateInput("/private/runtime.json"),
  );
  const claim = claimedJobSchema.parse(readPrivateInput("/private/claim.json"));
  const target = new URL(environment.SUPABASE_URL);
  if (
    environment.SUNAT_WORKER_MODE === "sunat" &&
    environment.SUNAT_SOURCE_VALIDATED !== "true"
  )
    throw new Error("SOURCE_PILOT_REQUIRED");
  const local = /^http:\/\/(127\.0\.0\.1|host\.docker\.internal):54431$/.test(
    environment.SUPABASE_URL,
  );
  if (
    environment.SUNAT_WORKER_MODE === "simulator"
      ? !local
      : target.protocol !== "https:" ||
        !target.hostname.endsWith(".supabase.co")
  )
    throw new Error("WORKER_DESTINATION_INVALID");
  if (process.getuid?.() !== 1001 || !process.env.DISPLAY)
    throw new Error("WORKER_RUNTIME_INVALID");
  const keys = parseSunatKeyring(
    environment.SUNAT_CREDENTIALS_CURRENT_KEY,
    environment.SUNAT_CREDENTIALS_KEYS,
  );
  const client = createClient<Database>(
    environment.SUPABASE_URL,
    environment.SUPABASE_SECRET_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
  const valid = await client
    .rpc("h10_worker_heartbeat", {
      p_job_id: claim.job.id,
      p_lease_token: claim.job.lease_token,
    })
    .abortSignal(AbortSignal.timeout(10000));
  if (valid.error || valid.data !== true) throw new Error("ACCESS_REVOKED");
  const source =
    environment.SUNAT_WORKER_MODE === "simulator"
      ? new SimulatorSunatSource(environment.SUPABASE_URL)
      : new OfficialSunatSource();
  const state = await runClaimedSunatJob(claim, { client, source }, keys);
  console.log(JSON.stringify({ event: "sunat.job.finished", state }));
  if (state === "failed") process.exitCode = 1;
}

main().catch(() => {
  console.error(
    JSON.stringify({
      event: "sunat.job.runtime_failed",
      code: "WORKER_RUNTIME_FAILED",
    }),
  );
  process.exitCode = 1;
});
