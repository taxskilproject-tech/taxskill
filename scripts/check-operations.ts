import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { isLocalSupabaseUrl } from "../src/config/env/utils/is-local-supabase-url";
import { operationsSnapshotSchema } from "../src/features/operations/contracts/operations.schema";
import { evaluateOperationsHealth } from "../src/features/operations/utils/evaluate-operations-health";
import type { Database } from "../src/lib/supabase/types/database.types";

async function main() {
  loadEnvConfig(process.cwd());
  const mode = process.argv[2];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (
    mode === "--local"
      ? !isLocalSupabaseUrl(url)
      : mode !== "--cloud" || url !== "https://gzwrqvqofcrdjvzoblaz.supabase.co"
  )
    throw new Error(
      "Selecciona --local o --cloud con el destino correspondiente.",
    );
  const organizationId = z
    .uuid()
    .parse(process.env.H08_OPERATION_ORGANIZATION_ID);
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("Falta la credencial privada del monitor.");
  const client = createClient<Database>(url, secret, {
    auth: { persistSession: false },
  });
  const result = await client.rpc("h08_health", {
    p_organization_id: organizationId,
  });
  if (result.error) throw new Error("El monitor no pudo consultar el estado.");
  const envelope = z
    .object({ ok: z.literal(true), data: operationsSnapshotSchema })
    .parse(result.data);
  const health = envelope.data;
  // Only aggregate counters and job status leave this executor, never payloads or credentials.
  console.info(JSON.stringify(health));
  const operationMode = z
    .enum(["production", "prepublication"])
    .parse(process.env.H08_OPERATION_MODE ?? "production");
  const evaluation = evaluateOperationsHealth({
    snapshot: health,
    mode: operationMode,
    now: Date.now(),
  });
  console.info(JSON.stringify(evaluation));
  if (evaluation.status === "degraded") process.exitCode = 1;
}
void main().catch(() => {
  console.error(
    "Monitoreo incompleto: revisa configuración y conectividad del ejecutor privado.",
  );
  process.exitCode = 1;
});
