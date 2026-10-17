import { spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { activityListSchema } from "../src/domain/activities/contracts/activity.schema";
import {
  whatsappBatchSchema,
  whatsappReceiptSchema,
} from "../src/domain/integrations/contracts/whatsapp.schema";
import type { WhatsappBatch } from "../src/domain/integrations/types/whatsapp.types";
import { notificationListSchema } from "../src/domain/notifications/contracts/notification.schema";
import { sessionContextSchema } from "../src/features/auth/contracts/session.schema";
import type { Database, Json } from "../src/lib/supabase/types/database.types";
import {
  LOCAL_DEMO_ENV_FILE,
  LOCAL_H02_FIXTURES_FILE,
} from "./constants/local-environment";
import type { H03Client } from "./types/h03.types";
import type { H06FaultOptions } from "./types/h06.types";
import { requireLocalTestEnvironment } from "./utils/require-local-test-environment";

const url = requireLocalTestEnvironment();
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient<Database>(
  url,
  process.env.SUPABASE_SECRET_KEY ?? "",
  options,
);
const secrets = z
  .object({
    H06_DISPATCH_SECRET: z.string().min(32),
    H06_PROVIDER_TOKEN: z.string().min(32),
    N8N_WEBHOOK_TOKEN: z.string().min(32),
    N8N_RECEIPT_TOKEN: z.string().min(32),
  })
  .parse(parseEnv(readFileSync(".env.h06-operations.docker.local", "utf8")));
const bootstrap = z
  .object({ BOOTSTRAP_EMAIL: z.email(), BOOTSTRAP_PASSWORD: z.string() })
  .parse(parseEnv(readFileSync(LOCAL_DEMO_ENV_FILE, "utf8")));
const identities = z
  .array(
    z.object({ email: z.email(), password: z.string(), roleCode: z.string() }),
  )
  .parse(JSON.parse(readFileSync(LOCAL_H02_FIXTURES_FILE, "utf8")));
const checks: string[] = [];
const digestIds: string[] = [];
const fixtureUsers: string[] = [];
const clients: H03Client[] = [];
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Lima",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const resultSchema = z.object({
  ok: z.literal(true),
  data: z
    .object({ resource_id: z.uuid(), revision: z.number(), status: z.string() })
    .passthrough(),
});
function ensure(value: unknown, label: string): asserts value {
  if (!value) throw new Error(`H06: ${label}`);
  checks.push(label);
}
async function login(email: string, password: string) {
  const client = createClient<Database>(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    options,
  );
  clients.push(client);
  const signedIn = await client.auth.signInWithPassword({ email, password });
  ensure(!signedIn.error, "fixture login");
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
  administrative = false,
  requestId = randomUUID(),
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
    const failure = z
      .object({ error: z.object({ code: z.string() }) })
      .safeParse(response.data);
    throw new Error(
      `H06 ${operation}: ${failure.success ? failure.data.error.code : "invalid contract"}`,
    );
  }
  return parsed.data.data;
}
async function query<T>(
  client: H03Client,
  org: string,
  resource: string,
  input: Json,
  schema: z.ZodType<T>,
) {
  const response = await client.rpc("h06_query", {
    p_organization_id: org,
    p_resource: resource,
    p_input: input,
  });
  ensure(!response.error, `query ${resource}`);
  return z.object({ ok: z.literal(true), data: schema }).parse(response.data)
    .data;
}
async function assign(
  client: H03Client,
  org: string,
  company: string | null,
  user: string,
  roleCode: string,
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
  ensure(member.data && role.data, "assignment context");
  const base = admin
    .from("access_grants")
    .select("id,revision")
    .eq("organization_id", org)
    .eq("member_id", member.data.id)
    .eq("module", "actividades");
  const previous = await (
    company
      ? base.eq("company_id", company)
      : base.is("company_id", null).eq("scope", "organization")
  ).maybeSingle();
  ensure(!previous.error, "existing activity grant");
  return command(
    client,
    org,
    "AssignAccess",
    {
      ...(previous.data
        ? { id: previous.data.id, expected_revision: previous.data.revision }
        : {}),
      member_id: member.data.id,
      scope: company ? "company" : "organization",
      company_id: company,
      module: "actividades",
      role_id: role.data.id,
      active: true,
    },
    true,
  );
}
async function createActivity(
  client: H03Client,
  org: string,
  company: string | null,
  user: string,
  title: string,
  frequency = "unica",
) {
  return command(client, org, "CreateAdditionalActivity", {
    company_id: company,
    title,
    description: "Descripción privada de prueba; no debe salir en WhatsApp.",
    delivery_responsible_id: user,
    frequency,
    due_date: today,
    deadline_offset_days: 0,
    priority: "alta",
    is_required: true,
    active: true,
    max_file_bytes: 20_000_000,
    allowed_formats: ["pdf"],
    deliverable_specs: [1, 2].map((position) => ({
      position_code: `h06_${position}`,
      label: `Archivo requerido ${position}`,
      display_order: position,
      allowed_formats: ["pdf"],
      max_file_bytes: 20_000_000,
    })),
  });
}
async function configureMock(input: H06FaultOptions) {
  const response = await fetch("http://127.0.0.1:5680/configure", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secrets.H06_PROVIDER_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  ensure(response.ok, "local provider configured");
}
async function mockState() {
  const response = await fetch("http://127.0.0.1:5680/state", {
    headers: { Authorization: `Bearer ${secrets.H06_PROVIDER_TOKEN}` },
  });
  ensure(response.ok, "local provider proof read");
  return z
    .object({
      providerCalls: z.record(
        z.string(),
        z.object({
          count: z.number(),
          status: z.string(),
          provider_message_id: z.string(),
          occurred_at: z.string(),
        }),
      ),
      dispatchCalls: z.array(
        z.object({ batch_id: z.string(), hash: z.string(), at: z.string() }),
      ),
    })
    .parse(await response.json());
}
async function dispatch() {
  const response = await fetch(`${url}/functions/v1/notification-operations`, {
    method: "POST",
    headers: {
      "x-dispatch-key": secrets.H06_DISPATCH_SECRET,
      "Content-Type": "application/json",
    },
    body: "{}",
    signal: AbortSignal.timeout(45000),
  });
  ensure(response.ok, `Edge dispatch HTTP ${response.status}`);
  const result = z
    .object({ status: z.literal("completed") })
    .safeParse(await response.json());
  ensure(result.success, "Edge contract confirmed");
}
async function digest(user: string, expectedStatus?: string) {
  const response = await admin
    .from("whatsapp_digests")
    .select("*")
    .eq("recipient_id", user)
    .eq("local_date", today)
    .single();
  ensure(response.data, "daily digest persisted");
  if (expectedStatus)
    ensure(
      response.data.status === expectedStatus,
      `provider result ${expectedStatus}, actual ${response.data.status}`,
    );
  return response.data;
}
async function waitForDigest(user: string, expectedStatus: string) {
  for (let index = 0; index < 30; index++) {
    const response = await admin
      .from("whatsapp_digests")
      .select("status")
      .eq("recipient_id", user)
      .eq("local_date", today)
      .maybeSingle();
    if (response.data?.status === expectedStatus)
      return digest(user, expectedStatus);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return digest(user, expectedStatus);
}
async function scenarioUser(
  client: H03Client,
  org: string,
  company: string,
  name: string,
) {
  const created = await admin.auth.admin.createUser({
    email: `h06-${name}-${randomUUID().slice(0, 8)}@example.test`,
    password: randomBytes(24).toString("base64url"),
    email_confirm: true,
  });
  ensure(
    created.data.user && !created.error,
    "local-only fixture identity created",
  );
  const user = created.data.user;
  const profile = await admin.from("profiles").upsert({
    user_id: user.id,
    email: user.email!,
    full_name: `H06 · ${name} · solo Docker`,
    provisioning_status: "ready",
    enabled: true,
    whatsapp_phone: "+15005550006",
  });
  ensure(!profile.error, "local fixture contact created");
  const member = await admin
    .from("organization_members")
    .insert({ organization_id: org, user_id: user.id, member_type: "client" });
  ensure(!member.error, "local fixture membership created");
  await assign(client, org, company, user.id, "cliente");
  await createActivity(
    client,
    org,
    company,
    user.id,
    `H06 ${name} — envío de prueba`,
  );
  fixtureUsers.push(user.id);
  return user.id;
}
async function callback(receipt: unknown, authenticated = true) {
  return fetch("http://127.0.0.1:3001/api/integrations/n8n/receipts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authenticated
        ? { Authorization: `Bearer ${secrets.N8N_RECEIPT_TOKEN}` }
        : {}),
    },
    body: JSON.stringify(receipt),
  });
}
async function runFilePipeline(id: string, deliveryRole: string) {
  const processResult = spawnSync(
    process.execPath,
    [
      "node_modules/tsx/dist/cli.mjs",
      "scripts/verify-h03.ts",
      "--module",
      "actividades",
      "--obligation-id",
      id,
      "--delivery-role",
      deliveryRole,
    ],
    { cwd: process.cwd(), encoding: "utf8", timeout: 180000 },
  );
  if (processResult.status !== 0)
    throw new Error(processResult.stdout + processResult.stderr);
  ensure(
    true,
    `shared upload/review/correction/reopening pipeline for ${deliveryRole}`,
  );
}
async function waitForN8n() {
  for (let index = 0; index < 45; index++) {
    const response = await fetch(
      "http://127.0.0.1:5679/healthz/readiness",
    ).catch(() => null);
    if (response?.ok) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("n8n local did not become ready after restart");
}
async function replayAfterRestart(batch: WhatsappBatch) {
  for (let index = 0; index < 60; index++) {
    const response = await fetch(
      "http://127.0.0.1:5679/webhook/taxskill-whatsapp-digest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secrets.N8N_WEBHOOK_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      },
    );
    if (response.ok) return response;
    if (![404, 503].includes(response.status))
      throw new Error(`Replay HTTP ${response.status}`);
    await response.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("n8n did not register its production webhook after restart");
}
async function main() {
  const stoppedSchedule = await admin.rpc("h06_schedule", {
    p_function_url: "http://kong:8000/functions/v1/notification-operations",
    p_secret: secrets.H06_DISPATCH_SECRET,
    p_enabled: false,
  });
  ensure(
    !stoppedSchedule.error,
    "pause only local H06 Cron during deterministic transport faults",
  );
  const administrator = await login(
    bootstrap.BOOTSTRAP_EMAIL,
    bootstrap.BOOTSTRAP_PASSWORD,
  );
  const org = administrator.context.organization.id;
  const clientIdentity = identities.find(
    (identity) => identity.roleCode === "cliente",
  );
  const accountantIdentity = identities.find(
    (identity) => identity.roleCode === "contador",
  );
  ensure(clientIdentity && accountantIdentity, "H02 local profiles exist");
  const client = await login(clientIdentity.email, clientIdentity.password);
  const accountant = await login(
    accountantIdentity.email,
    accountantIdentity.password,
  );
  const previous = await admin
    .from("companies")
    .select("id")
    .eq("organization_id", org)
    .eq("ruc", "20999999006")
    .maybeSingle();
  const company =
    previous.data?.id ??
    (
      await command(
        administrator.client,
        org,
        "CreateOrUpdateCompany",
        {
          ruc: "20999999006",
          legal_name: "H06 · Actividades · solo Docker",
          control_start_date: today,
          status: "active",
        },
        true,
      )
    ).resource_id;
  for (const identity of identities.filter((entry) =>
    ["cliente", "contador", "supervisor"].includes(entry.roleCode),
  )) {
    const fixture = await login(identity.email, identity.password);
    await assign(
      administrator.client,
      org,
      company,
      fixture.context.profile.user_id,
      identity.roleCode,
    );
    if (identity.roleCode !== "cliente")
      await assign(
        administrator.client,
        org,
        null,
        fixture.context.profile.user_id,
        identity.roleCode,
      );
  }
  await assign(
    administrator.client,
    org,
    company,
    administrator.context.profile.user_id,
    "contador",
  );
  await assign(
    administrator.client,
    org,
    null,
    administrator.context.profile.user_id,
    "contador",
  );
  let realtimeEvents = 0;
  const channel = client.client
    .channel(`personal-notices:${org}:${client.context.profile.user_id}`)
    .on("broadcast", { event: "changed" }, () => {
      realtimeEvents++;
    });
  await new Promise<void>((resolve, reject) =>
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
        reject(new Error(`Realtime ${status}`));
    }),
  );
  const companyActivity = await createActivity(
    administrator.client,
    org,
    company,
    client.context.profile.user_id,
    "H06 · Archivos adicionales de empresa",
  );
  const internalActivity = await createActivity(
    administrator.client,
    org,
    null,
    accountant.context.profile.user_id,
    "H06 · Actividad interna del estudio",
  );
  const recurrent = await createActivity(
    administrator.client,
    org,
    company,
    client.context.profile.user_id,
    "H06 · Seguimiento mensual",
    "mensual",
  );
  await new Promise((resolve) => setTimeout(resolve, 1500));
  ensure(
    realtimeEvents > 0,
    "personal notification channel received assignment",
  );
  ensure(
    (await client.client.removeChannel(channel)) === "ok",
    "personal realtime subscription closed",
  );
  const inbox = await query(
    client.client,
    org,
    "activities",
    { group: "all", company_id: company, pageSize: 100 },
    activityListSchema,
  );
  ensure(
    inbox.rows.some((row) => row.id === companyActivity.resource_id),
    "inbox uses the original additional UUID",
  );
  ensure(
    !inbox.rows.some((row) => row.id === internalActivity.resource_id),
    "client never sees internal activities",
  );
  ensure(
    inbox.indicators.documentary.required === 0 &&
      inbox.indicators.additional.required >= 2,
    "independent compliance denominators",
  );
  const noticeList = await query(
    client.client,
    org,
    "notifications",
    { page: 1 },
    notificationListSchema,
  );
  const notice = noticeList.rows.find(
    (row) => row.obligation_id === companyActivity.resource_id,
  );
  ensure(notice, "assignment notice is personal");
  await command(client.client, org, "MarkNotificationRead", {
    notification_id: notice.id,
  });
  await runFilePipeline(companyActivity.resource_id, "cliente");
  await runFilePipeline(internalActivity.resource_id, "contador");
  const denied = await callback({}, false);
  ensure(denied.status === 401, "unauthenticated receipt rejected");
  const invalid = await callback({});
  ensure(invalid.status === 422, "malformed authenticated receipt rejected");
  console.info(
    "H06: bandeja, Realtime, archivos de empresa/internos y frontera de receipts verificados.",
  );
  await configureMock({ reset: true, providerMode: "delivered" });
  // Existing users intentionally have no WhatsApp contact; only local scenario identities can reach the stub.
  const retryUser = await scenarioUser(
    administrator.client,
    org,
    company,
    "retry-429-500",
  );
  await configureMock({ faults: [429, 500], providerMode: "delivered" });
  await dispatch();
  const retried = await waitForDigest(retryUser, "delivered");
  digestIds.push(retried.delivery_id);
  ensure(
    retried.http_attempt_count === 3,
    "429 and 500 consume exactly three HTTP attempts",
  );
  let state = await mockState();
  const attempts = state.dispatchCalls.filter(
    (entry) =>
      entry.batch_id ===
      z.object({ batch_id: z.string() }).parse(retried.outbound_state).batch_id,
  );
  ensure(
    attempts.length === 3 &&
      new Set(attempts.map((entry) => entry.hash)).size === 1,
    "HTTP retries preserve batch identity and exact payload",
  );
  ensure(
    state.providerCalls[retried.delivery_id]?.count === 1,
    "transport retries call the provider only once",
  );
  const storedReceipt = z
    .object({ receipt: whatsappReceiptSchema })
    .parse(retried.gateway_state).receipt;
  ensure((await callback(storedReceipt)).ok, "receipt replay accepted");
  ensure(
    (
      await callback({
        ...storedReceipt,
        receipt_id: randomUUID(),
        status: "sent",
        occurred_at: new Date(Date.now() - 60000).toISOString(),
      })
    ).ok,
    "out-of-order sent callback accepted as historical evidence",
  );
  await digest(retryUser, "delivered");
  console.info(
    "H06: 429/500, payload estable y callbacks verificados; reiniciando n8n local.",
  );
  const restart = spawnSync("docker", ["restart", "tax-skill-h06-n8n"], {
    encoding: "utf8",
    timeout: 60000,
  });
  ensure(restart.status === 0, "real local n8n container restarted");
  await waitForN8n();
  const outbound = z
    .object({ batch_id: z.string(), generated_at: z.string() })
    .parse(retried.outbound_state);
  const external = z
    .object({
      delivery_id: z.string(),
      recipient_id: z.string(),
      local_date: z.string(),
      phone: z.string(),
      items: z.array(z.unknown()),
    })
    .parse(retried.payload);
  const replayBatch = whatsappBatchSchema.parse({
    schema_version: "1.0",
    batch_id: outbound.batch_id,
    event_type: "whatsapp.digest.batch",
    generated_at: outbound.generated_at,
    timezone: "America/Lima",
    digests: [external],
  });
  const replay = await replayAfterRestart(replayBatch);
  ensure(
    replay.ok,
    `workflow accepts replay after actual restart: HTTP ${replay.status}`,
  );
  state = await mockState();
  ensure(
    state.providerCalls[retried.delivery_id]?.count === 1,
    "durable claim prevents duplicate provider send after restart",
  );
  console.info("H06: replay tras reinicio sin segundo envío al proveedor.");
  const lostUser = await scenarioUser(
    administrator.client,
    org,
    company,
    "lost-response",
  );
  await configureMock({ faults: ["lost_response"], providerMode: "delivered" });
  await dispatch();
  const lost = await waitForDigest(lostUser, "delivered");
  digestIds.push(lost.delivery_id);
  state = await mockState();
  ensure(
    state.providerCalls[lost.delivery_id]?.count === 1 &&
      lost.http_attempt_count >= 2,
    "lost response retries same delivery without a second provider call",
  );
  const unknownUser = await scenarioUser(
    administrator.client,
    org,
    company,
    "provider-timeout",
  );
  await configureMock({ providerMode: "timeout" });
  await dispatch();
  const unknown = await waitForDigest(unknownUser, "unknown");
  digestIds.push(unknown.delivery_id);
  state = await mockState();
  const proof = state.providerCalls[unknown.delivery_id];
  ensure(
    proof?.count === 1 && proof.status === "delivered",
    "provider timeout remains unknown until independent reconciliation",
  );
  const recovered = {
    schema_version: "1.0",
    receipt_id: randomUUID(),
    delivery_id: unknown.delivery_id,
    status: proof.status,
    provider_message_id: proof.provider_message_id,
    occurred_at: proof.occurred_at,
  };
  ensure(
    (await callback(recovered)).ok,
    "independent local provider evidence can reconcile unknown",
  );
  await digest(unknownUser, "delivered");
  const failedUser = await scenarioUser(
    administrator.client,
    org,
    company,
    "provider-failure",
  );
  await configureMock({ providerMode: "failed" });
  await dispatch();
  const failed = await waitForDigest(failedUser, "failed");
  digestIds.push(failed.delivery_id);
  ensure(
    failed.accepted_at !== null && failed.delivered_at === null,
    "HTTP acceptance does not fabricate provider success",
  );
  const exhaustedUser = await scenarioUser(
    administrator.client,
    org,
    company,
    "http-timeout-limit",
  );
  await configureMock({
    providerMode: "delivered",
    faults: ["timeout", 429, 500],
  });
  await dispatch();
  const exhausted = await digest(exhaustedUser, "pending");
  digestIds.push(exhausted.delivery_id);
  state = await mockState();
  ensure(
    exhausted.http_attempt_count === 3 &&
      !state.providerCalls[exhausted.delivery_id],
    "HTTP timeout and retry limit do not fabricate a send",
  );
  await configureMock({ providerMode: "delivered" });
  await dispatch();
  const after = await digest(exhaustedUser);
  ensure(
    after.http_attempt_count === 3,
    "later dispatcher cannot exceed three attempts",
  );
  const logs = await admin
    .from("integration_attempts")
    .select("id,direction,result", { count: "exact" })
    .eq("digest_id", retried.id);
  ensure(
    !logs.error &&
      logs.data?.filter((row) => row.direction === "outbound").length === 6,
    "each HTTP attempt has immutable reservation and completion records",
  );
  const privacy = whatsappBatchSchema.safeParse(replayBatch);
  ensure(
    privacy.success &&
      !JSON.stringify(replayBatch).includes("Descripción privada"),
    "transport payload contains no activity private description",
  );
  const batchUsers = [
    await scenarioUser(administrator.client, org, company, "batch-a"),
    await scenarioUser(administrator.client, org, company, "batch-b"),
  ];
  await dispatch();
  const batchDigests = await Promise.all(
    batchUsers.map((user) => waitForDigest(user, "delivered")),
  );
  const batches = batchDigests.map(
    (entry) =>
      z.object({ batch_id: z.string() }).parse(entry.outbound_state).batch_id,
  );
  ensure(
    new Set(batches).size === 1,
    "two recipients share a frozen batch with independent deliveries",
  );
  state = await mockState();
  ensure(
    batchDigests.every(
      (entry) => state.providerCalls[entry.delivery_id]?.count === 1,
    ),
    "n8n routes multiple paired digest items to each recipient once",
  );
  digestIds.push(...batchDigests.map((entry) => entry.delivery_id));
  const cronUser = await scenarioUser(
    administrator.client,
    org,
    company,
    "cron-dispatch",
  );
  const schedule = await admin.rpc("h06_schedule", {
    p_function_url: "http://kong:8000/functions/v1/notification-operations",
    p_secret: secrets.H06_DISPATCH_SECRET,
  });
  ensure(!schedule.error, "local notification Cron registered");
  console.info("H06: esperando un resumen preparado y enviado por Cron local.");
  for (let index = 0; index < 90; index++) {
    const generated = await admin
      .from("whatsapp_digests")
      .select("status")
      .eq("recipient_id", cronUser)
      .eq("local_date", today)
      .maybeSingle();
    if (generated.data?.status === "delivered") break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const cronDigest = await digest(cronUser, "delivered");
  digestIds.push(cronDigest.delivery_id);
  ensure(
    (await mockState()).providerCalls[cronDigest.delivery_id]?.count === 1,
    "real Cron prepared and delivered a new summary without browser dispatch",
  );
  writeFileSync(
    "test-results/local/h06-evidence.json",
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        organization_id: org,
        company_id: company,
        company_activity_id: companyActivity.resource_id,
        internal_activity_id: internalActivity.resource_id,
        recurring_rule_id: recurrent.rule_id,
        fixture_user_ids: fixtureUsers,
        delivery_ids: digestIds,
        realtime_events: realtimeEvents,
        checks,
      },
      null,
      2,
    ),
  );
  console.info(
    `H06 local: ${checks.length} comprobaciones aprobadas; evidencia sin secretos en test-results/local/h06-evidence.json.`,
  );
  await administrator.client.auth.signOut();
  await client.client.auth.signOut();
  await accountant.client.auth.signOut();
}
main()
  .catch((cause: unknown) => {
    console.error(
      cause instanceof Error ? cause.message : "H06 integration failed",
    );
    process.exitCode = 1;
  })
  .finally(() => clients.forEach((client) => client.realtime.disconnect()));
