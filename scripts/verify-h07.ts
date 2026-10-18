import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { metadataResultSchema } from "../src/domain/reporting/contracts/consultation.schema";
import {
  reportFiltersSchema,
  reportResultSchema,
} from "../src/domain/reporting/contracts/reporting.schema";
import { generateExcel } from "../src/features/reporting/services/excel-report";
import { generatePdf } from "../src/features/reporting/services/pdf-report";
import type { Database } from "../src/lib/supabase/types/database.types";
import { LOCAL_BOOTSTRAP_ENV_FILE } from "./constants/environment-files";
import { requireLocalTestEnvironment } from "./utils/require-local-test-environment";

async function main() {
  const url = requireLocalTestEnvironment();
  const bootstrap = z
    .object({ BOOTSTRAP_EMAIL: z.email(), BOOTSTRAP_PASSWORD: z.string() })
    .parse(parseEnv(readFileSync(LOCAL_BOOTSTRAP_ENV_FILE, "utf8")));
  const client = createClient<Database>(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    { auth: { persistSession: false } },
  );
  const signIn = await client.auth.signInWithPassword({
    email: bootstrap.BOOTSTRAP_EMAIL,
    password: bootstrap.BOOTSTRAP_PASSWORD,
  });
  if (signIn.error || !signIn.data.user)
    throw new Error("No se pudo iniciar sesión local para verificar H07.");
  const org = "a7070000-0000-4000-8000-000000000001";
  const fixture = readFileSync(
    "scripts/fixtures/h07-capacity.psql",
    "utf8",
  ).replaceAll("__ACTOR__", z.uuid().parse(signIn.data.user.id));
  const seeded = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_tax-skill",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input: fixture, encoding: "utf8" },
  );
  if (seeded.status !== 0)
    throw new Error(seeded.stderr || "No se pudo preparar el volumen local.");
  const session = await client.rpc("h02_context");
  const mainOrg = z
    .object({
      ok: z.literal(true),
      data: z.object({ organization: z.object({ id: z.uuid() }) }),
    })
    .parse(session.data).data.organization.id;
  const metadata = await client.rpc("h07_query", {
    p_organization_id: mainOrg,
    p_resource: "documents",
    p_input: {},
  });
  z.object({ ok: z.literal(true), data: metadataResultSchema }).parse(
    metadata.data,
  );
  const measurements: Record<string, number[]> = {};
  const iterations = Number(process.env.H07_PERF_ITERATIONS ?? "20");
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 50)
    throw new Error("Iteraciones inválidas.");
  async function query(resource: string, input = {}) {
    const response = await client.rpc("h07_query", {
      p_organization_id: org,
      p_resource: resource,
      p_input: input,
    });
    if (response.error)
      throw new Error(
        `H07 ${resource}: ${response.error.code} ${response.error.message}`,
      );
    return z
      .object({ ok: z.literal(true), data: z.unknown() })
      .parse(response.data).data;
  }
  for (const resource of ["dashboard", "report", "documents", "audit"]) {
    await query(resource);
    const durations: number[] = [];
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      const start = performance.now();
      await query(resource);
      durations.push(performance.now() - start);
    }
    measurements[resource] = durations;
    console.info(
      `${resource}: P95=${[...durations].sort((a, b) => a - b)[Math.ceil(iterations * 0.95) - 1].toFixed(1)} ms (${iterations} consultas)`,
    );
  }
  const filters = reportFiltersSchema.parse({ year: 2026, month: 1 });
  const result = reportResultSchema.parse(
    await query("report", { ...filters, pageSize: 500 }),
  );
  if (result.count !== 1000)
    throw new Error(`Volumen inesperado: ${result.count}`);
  const second = reportResultSchema.parse(
    await query("report", { ...filters, page: 2, pageSize: 500 }),
  );
  if (second.fingerprint !== result.fingerprint)
    throw new Error("El universo cambió.");
  const payload = {
    rows: [...result.rows, ...second.rows],
    filters,
    metrics: result.metrics,
    groups: result.groups,
    generatedAt: new Date().toISOString(),
    queriedAt: result.queried_at,
    format: "xlsx" as const,
  };
  mkdirSync("test-results/local/h07", { recursive: true });
  const exportTimings: Record<string, number> = {};
  for (const format of ["xlsx", "pdf"]) {
    const start = performance.now();
    const blob =
      format === "xlsx"
        ? await generateExcel(payload)
        : await generatePdf(payload);
    exportTimings[format] = performance.now() - start;
    writeFileSync(
      `test-results/local/h07/capacidad.${format}`,
      new Uint8Array(await blob.arrayBuffer()),
    );
  }
  const req = randomUUID();
  const started = await client.rpc("h07_export", {
    p_organization_id: org,
    p_request_id: req,
    p_stage: "start",
    p_input: { format: "xlsx", filters },
  });
  if (
    z.object({ ok: z.literal(true) }).safeParse(started.data).success === false
  )
    throw new Error("Falló la reserva de exportación.");
  const finished = await client.rpc("h07_export", {
    p_organization_id: org,
    p_request_id: req,
    p_stage: "finish",
    p_input: { outcome: "generated", row_count: 1000 },
  });
  if (
    z.object({ ok: z.literal(true) }).safeParse(finished.data).success === false
  )
    throw new Error("Falló el registro de exportación.");
  writeFileSync(
    "test-results/local/h07/performance.json",
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        environment:
          "Docker local; HTTP loopback 54331; consultas autenticadas; 1 usuario concurrente; 1 calentamiento",
        companies: 30,
        users: 100,
        workers: 1000,
        obligations: 12000,
        metadataVersions: 1000,
        measurements,
        exportTimings,
        exportedRows: payload.rows.length,
        nodeHeapMB: process.memoryUsage().heapUsed / 1024 / 1024,
      },
      null,
      2,
    ),
  );
  await client.auth.signOut({ scope: "local" });
  console.info(
    "H07 local: volumen, exportaciones completas y auditoría verificados.",
  );
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Falló la verificación H07.",
  );
  process.exitCode = 1;
});
