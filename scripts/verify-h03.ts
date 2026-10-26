import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { Upload } from "tus-js-client";
import { z } from "zod";

import {
  detailSchema,
  finalizationSchema,
  signedDownloadSchema,
  signedUploadSchema,
} from "../src/domain/documents/contracts/document.schema";
import type { DocumentOperation } from "../src/domain/documents/types/document.types";
import type { Database, Json } from "../src/lib/supabase/types/database.types";
import {
  LOCAL_DEMO_ENV_FILE,
  LOCAL_H02_FIXTURES_FILE,
  LOCAL_H03_EVIDENCE_FILE,
  LOCAL_H03_SECRET_FILE,
} from "./constants/local-environment";
import { makeH03Pdf } from "./fixtures/h03-files";
import type { H03Client, LiveUpload } from "./types/h03.types";
import { readDocumentFixtureOptions } from "./utils/document-fixture-options";
import { requireLocalTestEnvironment } from "./utils/require-local-test-environment";

const url = requireLocalTestEnvironment();
const fixtureOptions = readDocumentFixtureOptions(process.argv.slice(2));
const documentModule = fixtureOptions.module;
const evidencePath = fixtureOptions["obligation-id"]
  ? `test-results/local/h06-files-${fixtureOptions["delivery-role"]}.json`
  : documentModule === "tributario"
    ? LOCAL_H03_EVIDENCE_FILE
    : `test-results/local/h05-${documentModule}-documents.json`;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const admin = createClient<Database>(
  url,
  process.env.SUPABASE_SECRET_KEY ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const bootstrap = z
  .object({ BOOTSTRAP_EMAIL: z.email(), BOOTSTRAP_PASSWORD: z.string() })
  .parse(parseEnv(readFileSync(LOCAL_DEMO_ENV_FILE, "utf8")));
const identities = z
  .array(
    z.object({ email: z.email(), password: z.string(), roleCode: z.string() }),
  )
  .parse(JSON.parse(readFileSync(LOCAL_H02_FIXTURES_FILE, "utf8")));
const checks: string[] = [];
function ensure(value: unknown, label: string): asserts value {
  if (!value) throw new Error(`H03: ${label}`);
  checks.push(label);
}
async function login(email: string, password: string) {
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const result = await client.auth.signInWithPassword({ email, password });
  ensure(!result.error, "fixture login");
  const context = await client.rpc("h02_context");
  const decoded = z
    .object({
      ok: z.literal(true),
      data: z.object({
        organization: z.object({ id: z.uuid() }),
        profile: z.object({ user_id: z.uuid() }),
      }),
    })
    .parse(context.data);
  return { client, context: decoded.data };
}
async function command(
  client: H03Client,
  org: string,
  operation: DocumentOperation,
  input: Json,
  requestId = randomUUID(),
) {
  const result = await client.rpc("h03_command", {
    p_organization_id: org,
    p_request_id: requestId,
    p_operation: operation,
    p_input: input,
  });
  ensure(!result.error, `RPC ${operation}`);
  const parsed = z
    .object({
      ok: z.literal(true),
      data: z.object({
        resource_id: z.uuid(),
        revision: z.number(),
        status: z.string(),
      }),
    })
    .safeParse(result.data);
  const failure = z
    .object({ error: z.object({ code: z.string() }) })
    .safeParse(result.data);
  ensure(
    parsed.success,
    failure.success
      ? `${operation} failed: ${failure.data.error.code}`
      : `${operation} confirmed`,
  );
  return parsed.data.data;
}
async function edge<T>(
  client: H03Client,
  body: Record<string, unknown>,
  schema: z.ZodType<T>,
) {
  const result = await client.functions.invoke("document-operations", { body });
  if (result.error) {
    const response = result.error.context;
    const value = response instanceof Response ? await response.json() : null;
    const error = z
      .object({ error: z.object({ code: z.string() }) })
      .safeParse(value);
    throw new Error(
      error.success ? error.data.error.code : "Edge dependency unavailable",
    );
  }
  return z.object({ ok: z.literal(true), data: schema }).parse(result.data)
    .data;
}
async function detail(client: H03Client, org: string, id: string) {
  const result = await client.rpc("h03_query", {
    p_organization_id: org,
    p_resource: "detail",
    p_input: { id },
  });
  return z
    .object({ ok: z.literal(true), data: detailSchema })
    .parse(result.data).data;
}
async function reserve(input: LiveUpload) {
  return command(input.client, input.organizationId, "CreateUploadIntent", {
    deliverable_id: input.slotId,
    cycle_id: input.cycleId,
    expected_revision: input.revision,
    original_name: input.name,
    declared_bytes: input.bytes.length,
    declared_mime: "application/octet-stream",
  });
}
async function send(input: LiveUpload, promoteBeforeConfirm = false) {
  const reserved = await reserve(input);
  const signed = await edge(
    input.client,
    { action: "prepare", intent_id: reserved.resource_id },
    signedUploadSchema,
  );
  const transferred = await input.client.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, input.bytes, {
      contentType: "application/octet-stream",
    });
  ensure(!transferred.error, "direct signed Storage transfer");
  if (promoteBeforeConfirm) {
    const intent = await input.admin
      .from("upload_intents")
      .select("final_bucket,final_path")
      .eq("id", reserved.resource_id)
      .single();
    ensure(intent.data, "reserved final path");
    const promoted = await input.admin.storage
      .from(intent.data.final_bucket)
      .upload(intent.data.final_path, input.bytes, {
        upsert: false,
        contentType: "application/pdf",
      });
    ensure(!promoted.error, "simulate promotion before SQL failure");
  }
  const finalized = await edge(
    input.client,
    { action: "finalize", intent_id: reserved.resource_id },
    finalizationSchema,
  );
  ensure(finalized.status === "ready", "trusted Edge finalization");
  const again = await edge(
    input.client,
    { action: "finalize", intent_id: reserved.resource_id },
    finalizationSchema,
  );
  ensure(
    again.version_id === finalized.version_id,
    "finalization replay returns same version",
  );
  return { intentId: reserved.resource_id, versionId: finalized.version_id };
}
async function resumable(input: LiveUpload) {
  const reserved = await reserve(input);
  const signed = await edge(
    input.client,
    { action: "prepare", intent_id: reserved.resource_id },
    signedUploadSchema,
  );
  const session = await input.client.auth.getSession();
  ensure(session.data.session, "TUS session");
  const endpoint =
    url.replace(".supabase.co", ".storage.supabase.co") +
    "/storage/v1/upload/resumable/sign";
  const options = {
    endpoint,
    chunkSize: 6 * 1024 * 1024,
    uploadDataDuringCreation: true,
    retryDelays: [0, 1000, 3000],
    headers: {
      apikey: key,
      "x-signature": signed.token,
    },
    metadata: {
      bucketName: signed.bucket,
      objectName: signed.path,
      contentType: "application/pdf",
      cacheControl: "0",
    },
  };
  const uploadUrl = await new Promise<string>((resolve, reject) => {
    const upload = new Upload(Buffer.from(input.bytes), {
      ...options,
      onError: reject,
      onChunkComplete: () => {
        const saved = upload.url;
        void upload
          .abort()
          .then(
            () =>
              saved ? resolve(saved) : reject(new Error("TUS URL unavailable")),
            reject,
          );
      },
    });
    upload.start();
  });
  const pending = await input.admin
    .from("document_versions")
    .select("id", { count: "exact", head: true })
    .eq("upload_intent_id", reserved.resource_id);
  ensure(pending.count === 0, "interrupted TUS is not a confirmed delivery");
  await new Promise<void>((resolve, reject) => {
    const resumed = new Upload(Buffer.from(input.bytes), {
      ...options,
      uploadUrl,
      onError: reject,
      onSuccess: () => resolve(),
    });
    resumed.start();
  });
  ensure(true, "TUS resumed after interruption");
  const finalized = await edge(
    input.client,
    { action: "finalize", intent_id: reserved.resource_id },
    finalizationSchema,
  );
  ensure(finalized.status === "ready", "resumed transfer finalized");
  return finalized.version_id;
}
async function configureDeliveryResponsible(
  client: H03Client,
  org: string,
  companyId: string,
  responsibleId: string,
) {
  const existing = await admin
    .from("company_module_settings")
    .select("id,revision")
    .eq("organization_id", org)
    .eq("company_id", companyId)
    .eq("module", documentModule)
    .maybeSingle();
  ensure(!existing.error, "read local module settings");
  const saved = await client.rpc("h02_command", {
    p_organization_id: org,
    p_request_id: randomUUID(),
    p_operation: "SaveModuleSettings",
    p_input: {
      id: existing.data?.id,
      expected_revision: existing.data?.revision,
      company_id: companyId,
      module: documentModule,
      delivery_responsible_id: responsibleId,
    },
  });
  ensure(
    !saved.error &&
      z.object({ ok: z.literal(true) }).safeParse(saved.data).success,
    "configured inherited delivery responsible",
  );
}

async function prepareDocumentFixture(
  administrator: Awaited<ReturnType<typeof login>>,
  client: Awaited<ReturnType<typeof login>>,
  org: string,
) {
  const targetId = fixtureOptions["obligation-id"];
  if (targetId) {
    const target = await admin
      .from("obligations")
      .select("id,company_id,rule_id,class,module")
      .eq("id", targetId)
      .eq("organization_id", org)
      .single();
    ensure(
      target.data?.class === "additional" &&
        target.data.module === "actividades",
      "existing local additional obligation",
    );
    return {
      obligationId: target.data.id,
      companyId: target.data.company_id,
      ruleId: target.data.rule_id,
    };
  }
  const company = await admin
    .from("companies")
    .select("id")
    .eq("organization_id", org)
    .eq(
      fixtureOptions["company-id"] ? "id" : "ruc",
      fixtureOptions["company-id"] ?? "20000000001",
    )
    .single();
  ensure(company.data, "H02 demonstration company");
  await configureDeliveryResponsible(
    administrator.client,
    org,
    company.data.id,
    client.context.profile.user_id,
  );
  const type = await admin
    .from("document_types")
    .select("id")
    .eq("organization_id", org)
    .eq("code", `h03_pdt_demo_${documentModule}`)
    .maybeSingle();
  const dtype =
    type.data?.id ??
    (
      await command(administrator.client, org, "SaveDocumentType", {
        code: `h03_pdt_demo_${documentModule}`,
        name: "PDT mensual",
        module: documentModule,
        suggested_formats: ["pdf"],
        active: true,
      })
    ).resource_id;
  const rule = await command(
    administrator.client,
    org,
    "ConfigureRequirement",
    {
      company_id: company.data.id,
      document_type_id: dtype,
      ...(fixtureOptions["employment-period-id"]
        ? { employment_period_id: fixtureOptions["employment-period-id"] }
        : {}),
      title: `PDT demostracion H03 ${randomUUID().slice(0, 8)}`,
      deadline_offset_days: 0,
      allowed_formats: ["pdf"],
      max_file_bytes: 20_000_000,
      deliverable_specs: [1, 2].map((position) => ({
        position_code: `pdt_${position}`,
        label: `PDT archivo ${position}`,
        display_order: position,
        allowed_formats: ["pdf"],
        max_file_bytes: 20_000_000,
      })),
    },
  );
  const generations = await Promise.all([
    command(administrator.client, org, "GenerateMonthly", {
      rule_id: rule.resource_id,
    }),
    command(administrator.client, org, "GenerateMonthly", {
      rule_id: rule.resource_id,
    }),
  ]);
  ensure(
    generations[0].resource_id === generations[1].resource_id,
    "concurrent generation yields one obligation",
  );
  const obligationId = generations[0].resource_id;

  return { obligationId, companyId: company.data.id, ruleId: rule.resource_id };
}

async function main() {
  const administrator = await login(
    bootstrap.BOOTSTRAP_EMAIL,
    bootstrap.BOOTSTRAP_PASSWORD,
  );
  const org = administrator.context.organization.id;
  const clientIdentity = identities.find(
    (identity) => identity.roleCode === fixtureOptions["delivery-role"],
  );
  const reviewerIdentity = identities.find(
    (identity) => identity.roleCode === "supervisor",
  );
  const accountantIdentity = identities.find(
    (identity) => identity.roleCode === "contador",
  );
  ensure(
    clientIdentity && reviewerIdentity && accountantIdentity,
    "H02 demonstration profiles",
  );
  const client = await login(clientIdentity.email, clientIdentity.password);
  const reviewer = await login(
    reviewerIdentity.email,
    reviewerIdentity.password,
  );
  const accountant = await login(
    accountantIdentity.email,
    accountantIdentity.password,
  );
  const { obligationId, companyId, ruleId } = await prepareDocumentFixture(
    administrator,
    client,
    org,
  );
  let current = await detail(client.client, org, obligationId);
  const slot1 = current.deliverables[0];
  const slot2 = current.deliverables[1];
  const cycle1 = current.cycles.find(
    (cycle) => cycle.deliverable_id === slot1.id,
  );
  const cycle2 = current.cycles.find(
    (cycle) => cycle.deliverable_id === slot2.id,
  );
  ensure(cycle1 && cycle2, "two initial cycles");
  const base = { client: client.client, admin, organizationId: org };
  try {
    await send({
      ...base,
      slotId: slot1.id,
      cycleId: cycle1.id,
      revision: 0,
      name: "false.pdf",
      bytes: new TextEncoder().encode("This is not a PDF file"),
    });
    throw new Error("Invalid content accepted");
  } catch (cause) {
    ensure(
      cause instanceof Error && cause.message === "FILE_INVALID",
      "reject spoofed file bytes" +
        (cause instanceof Error && /^[A-Z_]+$/.test(cause.message)
          ? ` (${cause.message})`
          : ""),
    );
  }
  const original = makeH03Pdf("PDT demonstration H03");
  const large = new Uint8Array(7 * 1024 * 1024);
  large.fill(32);
  large.set(original);
  large.set(new TextEncoder().encode("\n%%EOF\n"), large.length - 7);
  const version1 = await resumable({
    ...base,
    slotId: slot1.id,
    cycleId: cycle1.id,
    revision: 0,
    name: "pdt-resumable.pdf",
    bytes: large,
  });
  await send(
    {
      ...base,
      slotId: slot2.id,
      cycleId: cycle2.id,
      revision: 0,
      name: "pdt-second.pdf",
      bytes: makeH03Pdf("PDT second file"),
    },
    true,
  );
  current = await detail(reviewer.client, org, obligationId);
  ensure(
    current.summary.operational_due_date === null &&
      !current.summary.overdue &&
      current.summary.aggregate_state === "por_revisar",
    "timely delivery remains awaiting review",
  );
  const first = current.deliverables[0];
  const second = current.deliverables[1];
  const concurrent = await Promise.all(
    [reviewer.client, accountant.client].map((identity) =>
      identity.rpc("h03_command", {
        p_organization_id: org,
        p_request_id: randomUUID(),
        p_operation: "ApproveVersion",
        p_input: {
          deliverable_id: first.id,
          version_id: first.current_version_id,
          expected_revision: first.revision,
        },
      }),
    ),
  );
  const outcomes = concurrent.map((result) =>
    z
      .object({
        ok: z.boolean(),
        error: z.object({ code: z.string() }).optional(),
      })
      .parse(result.data),
  );
  ensure(
    outcomes.filter((outcome) => outcome.ok).length === 1 &&
      outcomes.some((outcome) => outcome.error?.code === "CONFLICT"),
    "simultaneous reviewers cannot overwrite",
  );
  current = await detail(reviewer.client, org, obligationId);
  ensure(
    current.summary.approved_count === 1 && current.summary.total_count === 2,
    "partial approval 1/2",
  );
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  await command(reviewer.client, org, "ObserveVersion", {
    deliverable_id: second.id,
    version_id: second.current_version_id,
    expected_revision: second.revision,
    comment: "Adjuntar la declaracion corregida.",
    new_due_date: today,
  });
  current = await detail(client.client, org, obligationId);
  const correction = current.cycles.find(
    (cycle) => cycle.deliverable_id === second.id,
  );
  ensure(
    correction && correction.reason === "correction",
    "observation opens correction cycle",
  );
  const corrected = current.deliverables.find((slot) => slot.id === second.id);
  ensure(corrected, "correction position");
  await send({
    ...base,
    slotId: second.id,
    cycleId: correction.id,
    revision: corrected.revision,
    name: "pdt-corrected.pdf",
    bytes: makeH03Pdf("Corrected declaration"),
  });
  current = await detail(reviewer.client, org, obligationId);
  const ready = current.deliverables.find((slot) => slot.id === second.id);
  ensure(ready, "corrected version");
  await command(reviewer.client, org, "ApproveVersion", {
    deliverable_id: ready.id,
    version_id: ready.current_version_id,
    expected_revision: ready.revision,
  });
  current = await detail(reviewer.client, org, obligationId);
  ensure(
    current.summary.aggregate_state === "aprobado",
    "all positions individually approved",
  );
  const approved = current.deliverables[0];
  await command(reviewer.client, org, "ReopenApproved", {
    deliverable_id: approved.id,
    version_id: approved.current_version_id,
    expected_revision: approved.revision,
    comment: "Nueva version necesaria para revision.",
    new_due_date: today,
  });
  current = await detail(client.client, org, obligationId);
  ensure(
    current.deliverables[0].current_version_id === null &&
      current.summary.approved_count === 1,
    "reopening removes only current approval",
  );
  const signed = await edge(
    client.client,
    {
      action: "download",
      organization_id: org,
      version_id: version1,
      request_id: randomUUID(),
    },
    signedDownloadSchema,
  );
  const downloaded = await fetch(signed.url);
  ensure(
    signed.expires_in === 60 &&
      downloaded.ok &&
      (await downloaded.arrayBuffer()).byteLength === large.length,
    "historical file downloaded through brief URL",
  );
  const anonymous = createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
  try {
    await edge(
      anonymous,
      {
        action: "download",
        organization_id: org,
        version_id: version1,
        request_id: randomUUID(),
      },
      signedDownloadSchema,
    );
    throw new Error("anonymous accepted");
  } catch (cause) {
    ensure(
      cause instanceof Error && cause.message === "UNAUTHENTICATED",
      "anonymous Edge denied",
    );
  }
  const cleanupSecret = z
    .string()
    .min(32)
    .parse(
      parseEnv(readFileSync(LOCAL_H03_SECRET_FILE, "utf8")).H03_CLEANUP_SECRET,
    );
  const rejected = await admin
    .from("upload_intents")
    .select("id,staging_bucket,staging_path")
    .eq("deliverable_id", slot1.id)
    .eq("state", "rejected")
    .single();
  ensure(rejected.data, "rejected synthetic staging fixture");
  const aged = await admin
    .from("upload_intents")
    .update({
      created_at: new Date(Date.now() - 26 * 3600000).toISOString(),
      expires_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    })
    .eq("id", rejected.data.id);
  ensure(!aged.error, "age only the synthetic rejected fixture for TTL test");
  const cleanup = await fetch(url + "/functions/v1/document-operations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cleanup-key": cleanupSecret,
    },
    body: JSON.stringify({ action: "cleanup" }),
  });
  ensure(cleanup.ok, "authenticated staging maintenance");
  const expired = await admin
    .from("upload_intents")
    .select("state,staging_cleaned_at")
    .eq("id", rejected.data.id)
    .single();
  const absent = await admin.storage
    .from(rejected.data.staging_bucket)
    .download(rejected.data.staging_path);
  ensure(
    expired.data?.state === "expired" &&
      expired.data.staging_cleaned_at &&
      absent.error,
    "expired staging removed and metadata retained",
  );
  ensure(
    (await fetch(signed.url)).ok,
    "cleanup preserves confirmed historical file",
  );
  writeFileSync(
    evidencePath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        organization_id: org,
        company_id: companyId,
        rule_id: ruleId,
        obligation_id: obligationId,
        deliverable_ids: [slot1.id, slot2.id],
        version_id: version1,
        checks,
      },
      null,
      2,
    ),
  );
  console.log(
    `${documentModule} local: ${checks.length} comprobaciones aprobadas. Evidencia sin secretos en ${evidencePath}.`,
  );
}
main().catch((cause) => {
  console.error(
    cause instanceof Error
      ? cause.message
      : "No se completo la verificacion H03.",
  );
  process.exitCode = 1;
});
