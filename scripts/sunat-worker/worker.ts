import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import { parseSunatKeyring } from "../../src/features/sunat-mailbox/services/credentials-crypto.server";
import type { Database } from "../../src/lib/supabase/types/database.types";
import { claimedJobSchema } from "./contracts/worker.schema";
import { runClaimedSunatJob } from "./services/run-job";
import { SimulatorSunatSource } from "./source/simulator-source";
import { OfficialSunatSource } from "./source/sunat-source";

async function main() {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const mode = process.env.SUNAT_WORKER_MODE;
  if (!url || !secret || (mode !== "sunat" && mode !== "simulator"))
    throw new Error("WORKER_CONFIGURATION_INVALID");
  if (mode === "sunat" && process.env.SUNAT_SOURCE_VALIDATED !== "true")
    throw new Error("SOURCE_PILOT_REQUIRED");
  if (mode === "sunat" && process.platform === "linux" && !process.env.DISPLAY)
    throw new Error("WORKER_DISPLAY_REQUIRED");
  if (
    mode === "simulator" &&
    !/^http:\/\/(127\.0\.0\.1|host\.docker\.internal):54431$/.test(url)
  )
    throw new Error("SIMULATOR_REQUIRES_ISOLATED_DOCKER");
  const keys = parseSunatKeyring(
    process.env.SUNAT_CREDENTIALS_CURRENT_KEY,
    process.env.SUNAT_CREDENTIALS_KEYS,
  );
  const client = createClient<Database>(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const workerId = randomUUID();
  const daily = process.env.SUNAT_RUN_DAILY === "true";
  let stopping = false;
  process.on("SIGINT", () => {
    stopping = true;
  });
  process.on("SIGTERM", () => {
    stopping = true;
  });
  while (!stopping) {
    const tick = await client.rpc("h10_worker_tick", {
      p_worker_id: workerId,
      p_mode: mode,
      p_run_daily: daily,
    });
    if (tick.error) throw new Error("WORKER_QUEUE_UNAVAILABLE");
    if (tick.data) {
      const claim = claimedJobSchema.parse(tick.data);
      const source =
        mode === "simulator"
          ? new SimulatorSunatSource(url)
          : new OfficialSunatSource();
      const state = await runClaimedSunatJob(claim, { client, source }, keys);
      console.log(
        JSON.stringify({ event: "job_finished", kind: claim.job.kind, state }),
      );
    }
    if (process.argv.includes("--once")) break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
main().catch(() => {
  console.error(
    "SUNAT_WORKER_FAILED: revisa configuración, conectividad y permisos del servicio.",
  );
  process.exitCode = 1;
});
