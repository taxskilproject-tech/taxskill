import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { FREQUENCIES } from "../src/domain/documents/constants/engine";
import { documentResultSchema } from "../src/domain/documents/contracts/document.schema";
import { calendarPreviewSchema } from "../src/domain/documents/contracts/engine.schema";
import type { Database, Json } from "../src/lib/supabase/types/database.types";
import {
  LOCAL_DEMO_ENV_FILE,
  LOCAL_H03_EVIDENCE_FILE,
} from "./constants/local-environment";
import { requireLocalTestEnvironment } from "./utils/require-local-test-environment";

const url = requireLocalTestEnvironment();
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const client = createClient<Database>(
  url,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  options,
);
const second = createClient<Database>(
  url,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  options,
);
const admin = createClient<Database>(
  url,
  process.env.SUPABASE_SECRET_KEY ?? "",
  options,
);
const credentials = z
  .object({ BOOTSTRAP_EMAIL: z.email(), BOOTSTRAP_PASSWORD: z.string() })
  .parse(parseEnv(readFileSync(LOCAL_DEMO_ENV_FILE, "utf8")));
const fixture = z
  .object({ organization_id: z.uuid(), company_id: z.uuid() })
  .parse(JSON.parse(readFileSync(LOCAL_H03_EVIDENCE_FILE, "utf8")));
const resultSchema = z.object({
  ok: z.literal(true),
  data: documentResultSchema,
});
const failureSchema = z.object({
  ok: z.literal(false),
  error: z.object({ code: z.string() }),
});
const checks: string[] = [];
function ensure(value: unknown, label: string): asserts value {
  if (!value) throw new Error(`H04: ${label}`);
  checks.push(label);
}
async function command(
  operation: string,
  input: Json,
  requestId = randomUUID(),
) {
  const response = await client.rpc("h03_command", {
    p_organization_id: fixture.organization_id,
    p_request_id: requestId,
    p_operation: operation,
    p_input: input,
  });
  ensure(!response.error, `transport ${operation}`);
  const parsed = resultSchema.safeParse(response.data);
  if (!parsed.success) {
    const failed = failureSchema.safeParse(response.data);
    throw new Error(
      `H04 ${operation}: ${failed.success ? failed.data.error.code : "invalid contract"}`,
    );
  }
  return parsed.data.data;
}
async function main() {
  for (const session of [client, second]) {
    const login = await session.auth.signInWithPassword({
      email: credentials.BOOTSTRAP_EMAIL,
      password: credentials.BOOTSTRAP_PASSWORD,
    });
    ensure(!login.error, "independent administrator session admitted");
    const context = await session.rpc("h02_context");
    ensure(
      z.object({ ok: z.literal(true) }).safeParse(context.data).success,
      "local context available",
    );
  }
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const type = await command("SaveDocumentType", {
    code: `h04_${randomUUID()}`,
    name: "Motor H04 · Docker",
    module: "tributario",
    suggested_formats: ["pdf"],
    active: true,
  });
  const base = {
    company_id: fixture.company_id,
    document_type_id: type.resource_id,
    title: "H04 recurrente",
    deadline_offset_days: 0,
    inherit_responsible: true,
    active: true,
    is_required: true,
    allowed_formats: ["pdf"],
    max_file_bytes: 20000000,
    deliverable_specs: [
      {
        position_code: "file_1",
        label: "Archivo H04",
        display_order: 1,
        allowed_formats: ["pdf"],
        max_file_bytes: 20000000,
      },
    ],
  };
  const rules: string[] = [];
  let monthly = "";
  let monthlyObligation = "";
  for (const frequency of FREQUENCIES) {
    const input = {
      ...base,
      title: `H04 ${frequency}`,
      frequency,
      anchor_date: ["unica", "personalizada"].includes(frequency)
        ? today
        : null,
      interval_count: frequency === "personalizada" ? 1 : null,
      interval_unit: frequency === "personalizada" ? "months" : null,
      applicability_conditions: {
        schema_version: 1,
        employment_stage: "any",
        event_types: frequency === "eventual" ? ["manual_request"] : [],
        termination_reasons: [],
      },
    };
    const preview = await client.rpc("h04_preview", {
      p_organization_id: fixture.organization_id,
      p_input: { ...input, reference_date: today },
    });
    ensure(
      z
        .object({ ok: z.literal(true), data: calendarPreviewSchema })
        .safeParse(preview.data).success,
      `${frequency}: calendar preview contract`,
    );
    const rule = await command("ConfigureRequirement", input);
    rules.push(rule.resource_id);
    const generation =
      frequency === "eventual"
        ? {
            rule_id: rule.resource_id,
            event_id: randomUUID(),
            event_type: "manual_request",
            reference_date: today,
          }
        : { rule_id: rule.resource_id };
    const operation =
      frequency === "eventual" ? "EmitRequirementEvent" : "GenerateRule";
    const first = await command(operation, generation);
    const replay = await command(operation, generation);
    const positions = await admin
      .from("deliverables")
      .select("id", { count: "exact", head: true })
      .eq("obligation_id", first.obligation_id ?? "");
    ensure(
      !positions.error && positions.count === base.deliverable_specs.length,
      `${frequency}: all required delivery positions persisted`,
    );
    ensure(
      first.obligation_id &&
        first.obligation_id === replay.obligation_id &&
        replay.generated_count === 0,
      `${frequency}: stable occurrence and complete positions`,
    );
    if (frequency === "eventual") {
      const changed = await client.rpc("h03_command", {
        p_organization_id: fixture.organization_id,
        p_request_id: randomUUID(),
        p_operation: operation,
        p_input: { ...generation, employment_period_id: randomUUID() },
      });
      ensure(
        failureSchema.parse(changed.data).error.code === "VALIDATION_ERROR",
        "company event rejects a worker destination",
      );
    }
    if (frequency === "mensual") {
      monthly = rule.resource_id;
      monthlyObligation = first.obligation_id ?? "";
    }
  }
  const original = await admin
    .from("obligations")
    .select("snapshot,initial_due_date")
    .eq("id", monthlyObligation)
    .single();
  ensure(!original.error, "snapshot before configuration change captured");
  const state = await admin
    .from("requirement_rules")
    .select("revision")
    .eq("id", monthly)
    .single();
  ensure(state.data, "configuration revision loaded");
  const edit = {
    ...base,
    frequency: "mensual",
    id: monthly,
    expected_revision: state.data.revision,
    title: "H04 siguiente versión",
    deadline_offset_days: 7,
  };
  const concurrent = await Promise.all(
    [client, second].map((session) =>
      session.rpc("h03_command", {
        p_organization_id: fixture.organization_id,
        p_request_id: randomUUID(),
        p_operation: "ConfigureRequirement",
        p_input: edit,
      }),
    ),
  );
  ensure(
    concurrent.filter(
      (response) => resultSchema.safeParse(response.data).success,
    ).length === 1 &&
      concurrent.filter(
        (response) => failureSchema.safeParse(response.data).success,
      ).length === 1,
    "concurrent sessions: one configuration wins",
  );
  const losing = concurrent.find(
    (response) => failureSchema.safeParse(response.data).success,
  );
  ensure(
    losing && failureSchema.parse(losing.data).error.code === "CONFLICT",
    "concurrent loser receives CONFLICT",
  );
  const after = await admin
    .from("obligations")
    .select("snapshot,initial_due_date")
    .eq("id", monthlyObligation)
    .single();
  ensure(
    JSON.stringify(original.data) === JSON.stringify(after.data),
    "editing configuration preserves full historical snapshot and deadline",
  );
  const raceRule = await command("ConfigureRequirement", {
    ...base,
    frequency: "diaria",
    title: "H04 generación concurrente",
  });
  const race = await Promise.all([
    command("GenerateRule", { rule_id: raceRule.resource_id }),
    command("GenerateRule", { rule_id: raceRule.resource_id }),
  ]);
  ensure(
    race[0].obligation_id === race[1].obligation_id &&
      race.reduce((sum, row) => sum + (row.generated_count ?? 0), 0) === 1,
    "concurrent generation emits exactly one obligation",
  );
  const cronRule = await command("ConfigureRequirement", {
    ...base,
    frequency: "diaria",
    title: "H04 Cron sin navegador",
  });
  const scheduled = await admin.rpc("h04_schedule_generation", {
    p_enabled: true,
  });
  ensure(!scheduled.error, "local Cron scheduled without browser");
  const deadline = Date.now() + 150000;
  let observed = false;
  while (Date.now() < deadline && !observed) {
    const events = await admin
      .from("audit_events")
      .select("id")
      .eq("system_actor", "h04-generation")
      .eq("action", "GenerateRequirement");
    const generated = await admin
      .from("obligations")
      .select("id")
      .eq("rule_id", cronRule.resource_id);
    if (events.error || generated.error)
      throw new Error("H04: no se pudo consultar el avance del Cron local.");
    observed = generated.data.length === 1 && events.data.length > 0;
    if (!observed) await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  ensure(
    observed,
    "real Cron emits the pending rule without client generation",
  );
  writeFileSync(
    "test-results/local/h04-evidence.json",
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        environment: "Docker local :54331",
        ...fixture,
        rule_ids: rules,
        monthly_rule_id: monthly,
        monthly_obligation_id: monthlyObligation,
        cron_rule_id: cronRule.resource_id,
        checks,
      },
      null,
      2,
    ),
  );
  console.log(
    `H04 Docker: ${checks.length} comprobaciones aprobadas; evidencia en test-results/local/h04-evidence.json.`,
  );
}
main().catch((cause) => {
  console.error(
    cause instanceof Error ? cause.message : "H04: verificación incompleta.",
  );
  process.exitCode = 1;
});
