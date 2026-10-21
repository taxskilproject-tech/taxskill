import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { AppSupabaseClient } from "../src/lib/supabase/types/client.types";
import type { Database } from "../src/lib/supabase/types/database.types";
import { LOCAL_EDGE_ENV_FILE } from "./constants/environment-files";
import { requireLocalTestEnvironment } from "./utils/require-local-test-environment";

const PAGE_SIZE = 5;
const RECIPIENTS = 100;
const RPC_BUDGET_MS = 8000;
const MAX_PAGES = 30;
const ORIGINAL_CAPACITY_STUDY = "a7070000-0000-4000-8000-000000000001";
const pageSchema = z.object({
  status: z.enum(["pending", "completed", "idle"]),
  prepared_count: z.number().int().nonnegative(),
  examined_recipients: z.number().int().max(PAGE_SIZE).optional(),
  has_more: z.boolean(),
});

function localSql(sql: string): string {
  const result = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_tax-skill",
      "psql",
      "-X",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-qAt",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    {
      input: sql,
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    },
  );
  if (result.status !== 0 || result.error)
    throw new Error("Falló la operación del laboratorio Docker de capacidad.");
  return result.stdout.trim();
}

async function preparePages(
  clients: readonly AppSupabaseClient[],
  org: string,
) {
  const durations: number[] = [];
  let prepared = 0;
  for (let page = 0; page < MAX_PAGES && prepared < RECIPIENTS; page++) {
    const began = performance.now();
    const result = await clients[page % clients.length].rpc(
      "h06_prepare_digests",
      {
        p_base_url: "https://app.example.test",
        p_organization_id: org,
        p_batch_size: PAGE_SIZE,
      },
    );
    const duration = performance.now() - began;
    if (result.error || duration >= RPC_BUDGET_MS)
      throw new Error(
        "Una página de preparación agotó o falló su presupuesto RPC.",
      );
    durations.push(duration);
    prepared += pageSchema.parse(result.data).prepared_count;
  }
  return { durations, prepared };
}

async function restoreCron(
  client: AppSupabaseClient,
  secret: string,
  wasActive: boolean,
) {
  if (!wasActive) return;
  const restored = await client.rpc("h06_schedule", {
    p_function_url: "http://kong:8000/functions/v1/notification-operations",
    p_secret: secret,
    p_enabled: true,
  });
  if (restored.error)
    throw new Error("No se pudo restablecer el Cron local H06.");
}

async function main() {
  const url = requireLocalTestEnvironment();
  const key = z.string().min(20).parse(process.env.SUPABASE_SECRET_KEY);
  const clients = [0, 1].map(() =>
    createClient<Database>(url, key, { auth: { persistSession: false } }),
  );
  const org = randomUUID();
  const cronWasActive =
    localSql(
      "select exists(select 1 from cron.job where jobname='h06-notifications-dispatch' and active)",
    ) === "t";
  const edge = parseEnv(readFileSync(LOCAL_EDGE_ENV_FILE, "utf8"));
  const secret = z.string().min(32).parse(edge.H06_DISPATCH_SECRET);
  const pause = await clients[0].rpc("h06_schedule", {
    p_function_url: "http://kong:8000/functions/v1/notification-operations",
    p_secret: secret,
    p_enabled: false,
  });
  if (pause.error)
    throw new Error("No se pudo pausar exclusivamente el Cron local H06.");
  try {
    localSql(
      readFileSync(
        "scripts/fixtures/h06-digest-capacity.psql",
        "utf8",
      ).replaceAll("__ORG__", org),
    );
    const { durations, prepared } = await preparePages(clients, org);
    const digests = await clients[0]
      .from("whatsapp_digests")
      .select("id,payload")
      .eq("organization_id", org)
      .order("id");
    if (
      digests.error ||
      prepared !== RECIPIENTS ||
      digests.data.length !== RECIPIENTS
    )
      throw new Error("La preparación no terminó los 100 destinatarios.");
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(digests.data))
      .digest("hex");
    const replay = await clients[1].rpc("h06_prepare_digests", {
      p_base_url: "https://app.example.test",
      p_organization_id: org,
    });
    const repeated = await clients[1]
      .from("whatsapp_digests")
      .select("id,payload")
      .eq("organization_id", org)
      .order("id");
    if (
      replay.error ||
      repeated.error ||
      pageSchema.parse(replay.data).prepared_count !== 0 ||
      fingerprint !==
        createHash("sha256").update(JSON.stringify(repeated.data)).digest("hex")
    )
      throw new Error("El replay cambió o duplicó payloads congelados.");
    const source = await clients[0]
      .from("organizations")
      .select("status")
      .eq("id", ORIGINAL_CAPACITY_STUDY)
      .single();
    if (source.error || source.data.status !== "active")
      throw new Error("La fuente original CAP-01 debe permanecer activa.");
    const sorted = [...durations].sort((a, b) => a - b);
    const result = {
      organization_id: org,
      obligations: 12000,
      recipients: RECIPIENTS,
      prepared,
      pages: durations.length,
      p95_ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
      max_ms: sorted.at(-1),
      replay_unchanged: true,
      original_capacity_active: true,
      external_dispatches: 0,
    };
    mkdirSync("test-results/correcciones-auditoria-2", { recursive: true });
    writeFileSync(
      "test-results/correcciones-auditoria-2/capacity-api.json",
      JSON.stringify(result, null, 2),
    );
    console.info(JSON.stringify(result));
  } finally {
    // Pause this completed fixture only, after all assertions; never hide the original active source.
    try {
      localSql(
        `update public.organizations set status='inactive' where id='${org}'`,
      );
    } finally {
      await restoreCron(clients[0], secret, cronWasActive);
    }
  }
}
void main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Falló la capacidad local de resúmenes.",
  );
  process.exitCode = 1;
});
