import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { DOCUMENT_CATALOG_TEMPLATES } from "../src/domain/documents/constants/catalog-templates";
import {
  workerDetailSchema,
  workerResultSchema,
} from "../src/domain/workers/contracts/worker.schema";
import { sessionContextSchema } from "../src/features/auth/contracts/session.schema";
import type { Database, Json } from "../src/lib/supabase/types/database.types";
import {
  LOCAL_DEMO_ENV_FILE,
  LOCAL_H02_FIXTURES_FILE,
} from "./constants/local-environment";
import type { H03Client } from "./types/h03.types";
import { requireLocalTestEnvironment } from "./utils/require-local-test-environment";

const url = requireLocalTestEnvironment();
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient<Database>(
  url,
  process.env.SUPABASE_SECRET_KEY ?? "",
  options,
);
const credentials = z
  .object({ BOOTSTRAP_EMAIL: z.email(), BOOTSTRAP_PASSWORD: z.string() })
  .parse(parseEnv(readFileSync(LOCAL_DEMO_ENV_FILE, "utf8")));
const identities = z
  .array(
    z.object({ email: z.email(), password: z.string(), roleCode: z.string() }),
  )
  .parse(JSON.parse(readFileSync(LOCAL_H02_FIXTURES_FILE, "utf8")));
const checks: string[] = [];
const GENERATION_BATCH_SIZE = 100;
const MAX_GENERATION_BATCHES = 100;
const resultSchema = z.object({
  ok: z.literal(true),
  data: workerResultSchema,
});
function ensure(value: unknown, label: string): asserts value {
  if (!value) throw new Error(`H05: ${label}`);
  checks.push(label);
}
function civilOffset(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
async function login(email: string, password: string) {
  const client = createClient<Database>(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    options,
  );
  const response = await client.auth.signInWithPassword({ email, password });
  ensure(!response.error, "fixture login");
  const context = await client.rpc("h02_context");
  return {
    client,
    context: z
      .object({ ok: z.literal(true), data: sessionContextSchema })
      .parse(context.data).data,
  };
}
async function command(
  client: H03Client,
  org: string,
  operation: string,
  input: Json,
  requestId = randomUUID(),
  administrative = false,
) {
  const response = await client.rpc(
    administrative ? "h02_command" : "h03_command",
    {
      p_organization_id: org,
      p_request_id: requestId,
      p_operation: operation,
      p_input: input,
    },
  );
  ensure(!response.error, `transport ${operation}`);
  const parsed = resultSchema.safeParse(response.data);
  if (!parsed.success) {
    const error = z
      .object({ error: z.object({ code: z.string() }) })
      .safeParse(response.data);
    throw new Error(
      `H05 ${operation}: ${error.success ? error.data.error.code : "invalid contract"}`,
    );
  }
  return parsed.data.data;
}
async function assign(
  client: H03Client,
  org: string,
  company: string,
  user: string,
  roleCode: string,
  documentModule: string,
) {
  const member = await admin
    .from("organization_members")
    .select("id")
    .eq("organization_id", org)
    .eq("user_id", user)
    .single();
  const role = await admin
    .from("roles")
    .select("id")
    .eq("organization_id", org)
    .eq("code", roleCode)
    .single();
  ensure(member.data && role.data, "assignment fixture context");
  const previous = await admin
    .from("access_grants")
    .select("id,revision")
    .eq("organization_id", org)
    .eq("member_id", member.data.id)
    .eq("company_id", company)
    .eq("module", documentModule)
    .maybeSingle();
  ensure(!previous.error, "existing local assignment loaded");
  await command(
    client,
    org,
    "AssignAccess",
    {
      ...(previous.data
        ? { id: previous.data.id, expected_revision: previous.data.revision }
        : {}),
      member_id: member.data.id,
      company_id: company,
      scope: "company",
      module: documentModule,
      role_id: role.data.id,
      active: true,
    },
    randomUUID(),
    true,
  );
}
async function detail(
  client: H03Client,
  org: string,
  company: string,
  worker: string,
  stage?: string,
) {
  const response = await client.rpc("h05_query", {
    p_organization_id: org,
    p_resource: "worker",
    p_input: {
      company_id: company,
      worker_id: worker,
      ...(stage ? { employment_period_id: stage } : {}),
    },
  });
  return z
    .object({ ok: z.literal(true), data: workerDetailSchema })
    .parse(response.data).data;
}
async function finishGeneration(employmentPeriodId: string) {
  for (let batch = 0; batch < MAX_GENERATION_BATCHES; batch += 1) {
    const result = await admin.rpc("h05_run_generation", {
      p_employment_period_id: employmentPeriodId,
      p_batch_size: GENERATION_BATCH_SIZE,
    });
    ensure(!result.error, "bounded local employment continuation");
    const progress = z.object({ status: z.string() }).parse(result.data);
    if (["completed", "idle"].includes(progress.status)) return;
  }
  throw new Error("H05: bounded employment generation did not complete.");
}
async function preparePreviousFixtures(
  client: H03Client,
  org: string,
  company: string,
) {
  const rules = await admin
    .from("requirement_rules")
    .select("id,revision")
    .eq("organization_id", org)
    .eq("company_id", company)
    .like("title", "H05 %")
    .eq("active", true)
    .is("deleted_at", null);
  ensure(!rules.error, "previous local H05 rule inventory");
  for (const rule of rules.data ?? []) {
    await command(client, org, "SetRuleActive", {
      rule_id: rule.id,
      expected_revision: rule.revision,
      active: false,
      reason:
        "Nueva ejecución de fixtures H05 en Docker; conservar obligaciones e historia.",
    });
  }
  const periods = await admin
    .from("employment_periods")
    .select("id")
    .eq("organization_id", org)
    .eq("company_id", company);
  ensure(!periods.error, "previous local H05 generation inventory");
  for (const period of periods.data ?? []) await finishGeneration(period.id);
}
async function main() {
  const administrator = await login(
    credentials.BOOTSTRAP_EMAIL,
    credentials.BOOTSTRAP_PASSWORD,
  );
  const org = administrator.context.organization.id;
  const fixtures = [];
  for (const identity of identities.filter((entry) =>
    ["cliente", "contador", "supervisor"].includes(entry.roleCode),
  ))
    fixtures.push({
      ...(await login(identity.email, identity.password)),
      roleCode: identity.roleCode,
    });
  const delivery = fixtures.find((entry) => entry.roleCode === "cliente");
  const accountant = fixtures.find((entry) => entry.roleCode === "contador");
  ensure(
    delivery && accountant,
    "local client and accountant fixtures available",
  );
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const existing = await admin
    .from("companies")
    .select("id")
    .eq("organization_id", org)
    .eq("ruc", "20999999005")
    .maybeSingle();
  ensure(!existing.error, "local H05 company lookup");
  const company =
    existing.data?.id ??
    (
      await command(
        administrator.client,
        org,
        "CreateOrUpdateCompany",
        {
          ruc: "20999999005",
          legal_name: "H05 · Empresa de pruebas local",
          control_start_date: civilOffset(today, -30),
          status: "active",
        },
        randomUUID(),
        true,
      )
    ).resource_id;
  for (const documentModule of [
    "tributario",
    "laboral_general",
    "laboral_trabajador",
  ]) {
    for (const fixture of fixtures)
      await assign(
        administrator.client,
        org,
        company,
        fixture.context.profile.user_id,
        fixture.roleCode,
        documentModule,
      );
    await assign(
      administrator.client,
      org,
      company,
      administrator.context.profile.user_id,
      "contador",
      documentModule,
    );
    const previous = await admin
      .from("company_module_settings")
      .select("id,revision")
      .eq("organization_id", org)
      .eq("company_id", company)
      .eq("module", documentModule)
      .maybeSingle();
    await command(
      administrator.client,
      org,
      "SaveModuleSettings",
      {
        ...(previous.data
          ? { id: previous.data.id, expected_revision: previous.data.revision }
          : {}),
        company_id: company,
        module: documentModule,
        delivery_responsible_id: delivery.context.profile.user_id,
      },
      randomUUID(),
      true,
    );
  }
  await preparePreviousFixtures(administrator.client, org, company);
  const imported = await command(
    administrator.client,
    org,
    "ImportDocumentCatalog",
    { templates: DOCUMENT_CATALOG_TEMPLATES },
  );
  ensure(
    (imported.generated_count ?? 0) <= DOCUMENT_CATALOG_TEMPLATES.length,
    "editable initial catalog available",
  );
  const repeated = await command(
    administrator.client,
    org,
    "ImportDocumentCatalog",
    { templates: DOCUMENT_CATALOG_TEMPLATES },
  );
  ensure(
    repeated.generated_count === 0,
    "catalog import is repeatable and preserves existing codes",
  );
  const base = {
    company_id: company,
    frequency: "eventual",
    deadline_offset_days: 3,
    active: true,
    inherit_responsible: true,
    max_file_bytes: 20000000,
    allowed_formats: ["pdf"],
    deliverable_specs: [
      {
        position_code: "file_1",
        label: "Archivo requerido",
        display_order: 1,
        max_file_bytes: 20000000,
        allowed_formats: ["pdf"],
      },
    ],
  };
  const ruleIds: string[] = [];
  for (const stage of ["ingreso", "relacion", "cese", "renuncia", "manual"]) {
    const type = await command(administrator.client, org, "SaveDocumentType", {
      code: `h05_${stage}_${randomUUID()}`,
      name: `H05 ${stage}`,
      module: "laboral_trabajador",
      category: stage,
      active: true,
      suggested_formats: ["pdf"],
    });
    const rule = await command(
      administrator.client,
      org,
      "ConfigureRequirement",
      {
        ...base,
        document_type_id: type.resource_id,
        title: `H05 ${stage}`,
        frequency: stage === "relacion" ? "mensual" : "eventual",
        applicability_conditions: {
          schema_version: 1,
          employment_stage:
            stage === "renuncia"
              ? "cese"
              : stage === "manual"
                ? "relacion"
                : stage,
          event_types:
            stage === "relacion"
              ? []
              : [
                  stage === "ingreso"
                    ? "worker_hired"
                    : stage === "manual"
                      ? "manual_request"
                      : "worker_terminated",
                ],
          termination_reasons: stage === "renuncia" ? ["renuncia"] : [],
        },
      },
    );
    ruleIds.push(rule.resource_id);
  }
  const workerInput = {
    company_id: company,
    identity_type: "OTHER",
    identity_number: `H05-${randomUUID()}`,
    first_names: "Trabajador",
    last_names: "Demostración local",
    birth_date: "1990-01-01",
    email: null,
    phone: null,
    address: null,
    notes: "Nota privada local",
    employment: {
      start_date: civilOffset(today, -60),
      reference_salary: "1234.50",
      currency: "PEN",
    },
  };
  const request = randomUUID();
  const worker = await command(
    administrator.client,
    org,
    "RegisterWorker",
    workerInput,
    request,
  );
  ensure(
    (
      await command(
        administrator.client,
        org,
        "RegisterWorker",
        workerInput,
        request,
      )
    ).resource_id === worker.resource_id,
    "worker registration replay returns same identity",
  );
  const original = await detail(
    administrator.client,
    org,
    company,
    worker.resource_id,
  );
  ensure(
    original.selected_period &&
      original.selected_period.reference_salary === "1234.50",
    "exact salary and current default stage",
  );
  const firstStage = original.selected_period;
  const initial = await admin
    .from("obligations")
    .select("id,snapshot")
    .eq("employment_period_id", firstStage.id);
  ensure(
    !initial.error && initial.data.length >= 2,
    "old hire creates current checklist and payroll",
  );
  const endInput = {
    company_id: company,
    worker_id: worker.resource_id,
    employment_period_id: firstStage.id,
    expected_revision: firstStage.revision,
    end_date: civilOffset(today, -1),
    termination_reason: "despido",
  };
  const ended = await command(
    accountant.client,
    org,
    "EndEmployment",
    endInput,
  );
  ensure(
    ["completed", "pending"].includes(ended.status),
    "accountant with workers.manage can end employment with durable generation",
  );
  await finishGeneration(firstStage.id);
  const noAplica = await admin
    .from("obligations")
    .select("id")
    .eq("employment_period_id", firstStage.id)
    .eq("disposition", "no_aplica");
  ensure(
    !noAplica.error && noAplica.data.length > 0,
    "non-renunciation records No aplica",
  );
  const current = await detail(
    administrator.client,
    org,
    company,
    worker.resource_id,
  );
  ensure(
    current.selected_period?.end_date === endInput.end_date &&
      current.selected_period.termination_reason ===
        endInput.termination_reason,
    "employment end is committed even when document generation remains pending",
  );
  const startInput = {
    company_id: company,
    worker_id: worker.resource_id,
    expected_revision: current.worker.revision,
    start_date: today,
    reference_salary: "2000.01",
    currency: "PEN",
  };
  const competing = await Promise.all(
    [administrator.client, accountant.client].map((client) =>
      client.rpc("h03_command", {
        p_organization_id: org,
        p_request_id: randomUUID(),
        p_operation: "StartEmployment",
        p_input: startInput,
      }),
    ),
  );
  ensure(
    competing.filter(
      (response) => resultSchema.safeParse(response.data).success,
    ).length === 1,
    "two actors cannot open two stages concurrently",
  );
  const after = await detail(
    administrator.client,
    org,
    company,
    worker.resource_id,
  );
  ensure(
    after.selected_period &&
      after.selected_period.sequence_number === 2 &&
      after.selected_period.id !== firstStage.id,
    "reentry defaults to a new independent active stage",
  );
  const activeStage = after.selected_period;
  const historical = await detail(
    delivery.client,
    org,
    company,
    worker.resource_id,
    firstStage.id,
  );
  ensure(
    historical.selected_period?.end_date === civilOffset(today, -1),
    "labor view includes historical conditions without extra permissions",
  );
  const source = await admin
    .from("obligations")
    .select("id,snapshot")
    .in(
      "id",
      initial.data.map((row) => row.id),
    );
  ensure(
    JSON.stringify(
      initial.data.toSorted((left, right) => left.id.localeCompare(right.id)),
    ) ===
      JSON.stringify(
        source.data?.toSorted((left, right) => left.id.localeCompare(right.id)),
      ),
    "reentry preserves previous obligation snapshots",
  );
  const forbidden = await delivery.client.rpc("h03_command", {
    p_organization_id: org,
    p_request_id: randomUUID(),
    p_operation: "RegisterWorker",
    p_input: { ...workerInput, identity_number: `DENIED-${randomUUID()}` },
  });
  ensure(
    z
      .object({
        ok: z.literal(false),
        error: z.object({ code: z.literal("FORBIDDEN") }),
      })
      .safeParse(forbidden.data).success,
    "client without workers.manage cannot mutate workers",
  );
  const event = {
    company_id: company,
    worker_id: worker.resource_id,
    employment_period_id: activeStage.id,
    expected_revision: activeStage.revision,
    rule_id: ruleIds[4],
    event_id: randomUUID(),
    reference_date: today,
  };
  const manual = await command(
    accountant.client,
    org,
    "EmitEmploymentRequest",
    event,
  );
  const manualReplay = await command(
    accountant.client,
    org,
    "EmitEmploymentRequest",
    event,
  );
  ensure(
    manual.obligation_id === manualReplay.obligation_id &&
      manualReplay.generated_count === 0,
    "manual employment event keeps its identity on retry",
  );
  const childEvidence: string[] = [];
  for (const documentModule of [
    "tributario",
    "laboral_general",
    "laboral_trabajador",
  ]) {
    const args = [
      "--import",
      "tsx",
      "scripts/verify-h03.ts",
      "--module",
      documentModule,
      "--company-id",
      company,
      ...(documentModule === "laboral_trabajador"
        ? ["--employment-period-id", activeStage.id]
        : []),
    ];
    const execution = spawnSync(process.execPath, args, {
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 2 * 1024 * 1024,
    });
    const logPath = `test-results/local/h05-${documentModule}-run.log`;
    writeFileSync(logPath, execution.stdout + execution.stderr);
    ensure(
      execution.status === 0 && !execution.error,
      `shared upload/review/correction/reopening pipeline: ${documentModule}`,
    );
    childEvidence.push(
      documentModule === "tributario"
        ? "test-results/local/h03-evidence.json"
        : `test-results/local/h05-${documentModule}-documents.json`,
    );
  }
  const hireRule = await admin
    .from("requirement_rules")
    .select("document_type_id")
    .eq("id", ruleIds[0])
    .single();
  ensure(hireRule.data?.document_type_id, "hire type for bounded Cron fixture");
  const extraHireRules: string[] = [];
  for (let index = 0; index < 30; index += 1) {
    const rule = await command(
      administrator.client,
      org,
      "ConfigureRequirement",
      {
        ...base,
        document_type_id: hireRule.data.document_type_id,
        title: `H05 Cron checklist ${index + 1}`,
        applicability_conditions: {
          schema_version: 1,
          employment_stage: "ingreso",
          event_types: ["worker_hired"],
          termination_reasons: [],
        },
      },
    );
    extraHireRules.push(rule.resource_id);
  }
  const pending = await command(administrator.client, org, "RegisterWorker", {
    ...workerInput,
    identity_number: `H05-${randomUUID()}`,
    first_names: "Checklist",
    last_names: "Cron local",
  });
  ensure(
    pending.status === "pending" && pending.employment_period_id,
    "large checklist leaves durable pending progress",
  );
  const scheduled = await admin.rpc("h05_schedule_generation", {
    p_enabled: true,
  });
  ensure(!scheduled.error, "employment continuation Cron configured locally");
  let completed = false;
  const deadline = Date.now() + 150000;
  while (!completed && Date.now() < deadline) {
    const progress = await admin
      .from("employment_periods")
      .select("document_generation")
      .eq("id", pending.employment_period_id)
      .single();
    if (progress.error)
      throw new Error("H05: no se pudo consultar el avance del Cron laboral.");
    const state = z
      .object({ hire: z.object({ status: z.string() }) })
      .parse(progress.data.document_generation);
    completed = state.hire.status === "completed";
    if (!completed) await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  const systemEmitted = await admin
    .from("obligations")
    .select("id")
    .eq("employment_period_id", pending.employment_period_id)
    .in("rule_id", extraHireRules)
    .is("created_by", null);
  ensure(
    completed && !systemEmitted.error && systemEmitted.data.length > 0,
    "real employment Cron completes remaining checklist without browser",
  );
  writeFileSync(
    "test-results/local/h05-evidence.json",
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        environment: "Docker :54331",
        organization_id: org,
        company_id: company,
        worker_id: worker.resource_id,
        first_employment_period_id: firstStage.id,
        active_employment_period_id: activeStage.id,
        rule_ids: ruleIds,
        child_evidence: childEvidence,
        cron_employment_period_id: pending.employment_period_id,
        checks,
      },
      null,
      2,
    ),
  );
  console.log(
    `H05 Docker: ${checks.length} comprobaciones; tres recorridos documentales compartidos y evidencia local sin secretos.`,
  );
}
main().catch((cause) => {
  console.error(
    cause instanceof Error ? cause.message : "H05: verificación incompleta.",
  );
  process.exitCode = 1;
});
