import { mkdirSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "../src/lib/supabase/types/database.types";
import { requireLocalTestEnvironment } from "./utils/require-local-test-environment";

const CAPACITY_ORGANIZATION = "a7070000-0000-4000-8000-000000000001";
const MAX_PAGES = 200;
const RPC_BUDGET_MS = 8000;
const pageSchema = z.object({
  status: z.enum(["pending", "completed"]),
  organization_id: z.literal(CAPACITY_ORGANIZATION),
  examined_obligations: z.number().int().min(0).max(100),
  has_more: z.boolean(),
});

async function main() {
  const url = requireLocalTestEnvironment();
  const key = z.string().min(20).parse(process.env.SUPABASE_SECRET_KEY);
  const clients = [0, 1].map(() =>
    createClient<Database>(url, key, { auth: { persistSession: false } }),
  );
  const organization = await clients[0]
    .from("organizations")
    .select("status,deleted_at")
    .eq("id", CAPACITY_ORGANIZATION)
    .single();
  if (
    organization.error ||
    organization.data.status !== "active" ||
    organization.data.deleted_at
  )
    throw new Error(
      "Ejecuta primero las fixtures locales de capacidad H07; el estudio debe permanecer activo.",
    );
  const source = await clients[0]
    .from("obligations")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", CAPACITY_ORGANIZATION)
    .is("delivery_responsible_id", null);
  if (source.error || source.count !== 12000)
    throw new Error(
      "La fuente local debe contener 12.000 obligaciones sin responsable.",
    );
  const durations: number[] = [];
  let processed = 0;
  let completed = false;
  for (let index = 0; index < MAX_PAGES; index++) {
    const started = performance.now();
    const response = await clients[index % clients.length].rpc(
      "h06_run_deadlines",
      { p_organization_id: CAPACITY_ORGANIZATION, p_batch_size: 100 },
    );
    const elapsed = performance.now() - started;
    if (response.error)
      throw new Error(
        "La página agotó o falló su presupuesto RPC: " + response.error.code,
      );
    if (elapsed >= RPC_BUDGET_MS)
      throw new Error(
        "La página excedió el presupuesto real de ocho segundos.",
      );
    const page = pageSchema.parse(response.data);
    durations.push(elapsed);
    processed += page.examined_obligations;
    if (!page.has_more) {
      completed = true;
      break;
    }
  }
  if (!completed)
    throw new Error(
      "El cursor no terminó dentro del número máximo de páginas.",
    );
  const beforeRepeat = await clients[0]
    .from("notification_events")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", CAPACITY_ORGANIZATION)
    .eq("event_type", "assignment_issue");
  const repeat = await clients[1].rpc("h06_run_deadlines", {
    p_organization_id: CAPACITY_ORGANIZATION,
  });
  const afterRepeat = await clients[0]
    .from("notification_events")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", CAPACITY_ORGANIZATION)
    .eq("event_type", "assignment_issue");
  if (
    beforeRepeat.error ||
    afterRepeat.error ||
    repeat.error ||
    beforeRepeat.count !== 12000 ||
    afterRepeat.count !== beforeRepeat.count
  )
    throw new Error("Los avisos no completaron la fuente sin duplicados.");
  const repeated = pageSchema.parse(repeat.data);
  if (repeated.has_more || repeated.examined_obligations !== 0)
    throw new Error("El barrido vuelve a procesar incidencias estables.");
  const sorted = [...durations].sort((left, right) => left - right);
  const result = {
    source_active: true,
    obligations: source.count,
    pages: durations.length,
    processed,
    p95_ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
    max_ms: sorted.at(-1),
    notices: afterRepeat.count,
    repeat_examined: repeated.examined_obligations,
  };
  mkdirSync("test-results", { recursive: true });
  writeFileSync(
    "test-results/correcciones-auditoria-capacidad.json",
    JSON.stringify(result, null, 2),
  );
  console.info(JSON.stringify(result));
}
void main().catch((cause) => {
  console.error(
    cause instanceof Error
      ? cause.message
      : "No se pudo comprobar la capacidad local.",
  );
  process.exitCode = 1;
});
