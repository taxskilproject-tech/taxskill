import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  sunatCommandResultSchema,
  sunatDetailSchema,
  sunatMessageListSchema,
  sunatWorkspaceSchema,
} from "../../src/domain/sunat/contracts/sunat.schema";
import { sessionContextSchema } from "../../src/features/auth/contracts/session.schema";
import { parseSunatKeyring } from "../../src/features/sunat-mailbox/services/credentials-crypto.server";
import type { Database } from "../../src/lib/supabase/types/database.types";
import { asJson } from "../../src/lib/supabase/utils/as-json";
import { runMonthlyMailboxQuery } from "../sunat-pilot/worker/services/run-monthly-query";
import { claimedJobSchema } from "../sunat-worker/contracts/worker.schema";
import { workerCheckpointStore } from "../sunat-worker/repositories/worker-repository";
import { runClaimedSunatJob } from "../sunat-worker/services/run-job";
import { SimulatorSunatSource } from "../sunat-worker/source/simulator-source";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const base = process.env.APP_BASE_URL;
if (url !== "http://127.0.0.1:54431" || base !== "http://localhost:4003")
  throw new Error("H10_REQUIRES_ISOLATED_DOCKER");
const publicKey = z
  .string()
  .parse(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const service = z.string().parse(process.env.SUPABASE_SECRET_KEY);
const admin = createClient<Database>(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const credentials = z
  .object({ BOOTSTRAP_EMAIL: z.email(), BOOTSTRAP_PASSWORD: z.string() })
  .parse(parseEnv(readFileSync(".envs/local/bootstrap.env", "utf8")));
const cookies = new Map<string, string>();
const client = createServerClient<Database>(url, publicKey, {
  cookies: {
    getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
    setAll: (entries) =>
      entries.forEach(({ name, value }) => cookies.set(name, value)),
  },
});
const signed = await client.auth.signInWithPassword({
  email: credentials.BOOTSTRAP_EMAIL,
  password: credentials.BOOTSTRAP_PASSWORD,
});
if (signed.error) throw new Error("H10_LOCAL_LOGIN_FAILED");
const contextResponse = await client.rpc("h02_context");
const context = z
  .object({ ok: z.literal(true), data: sessionContextSchema })
  .parse(contextResponse.data).data;
const organization = context.organization.id;
const company = context.companies.find((item) => item.ruc === "20000000901");
if (!company) throw new Error("H10_NEEDS_H09_FIXTURE");
const checks: string[] = [];
const input = {
  organization_id: organization,
  company_id: company.id,
  request_id: randomUUID(),
  expected_revision: -1,
  sol_username: "simulator-taxskill",
  sol_password: "Fictional-Docker-Only",
  consent: true,
};
const workspaceInput = { company_id: company.id, year: 2026, month: 10 };
const initial = await client.rpc("h10_query", {
  p_organization_id: organization,
  p_resource: "workspace",
  p_input: workspaceInput,
});
const previous = z
  .object({ ok: z.literal(true), data: sunatWorkspaceSchema })
  .parse(initial.data).data;
input.expected_revision = previous.connection?.revision ?? -1;

async function api(path: string, value: unknown, origin = base!) {
  return fetch(base + path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      cookie: [...cookies]
        .map(([name, content]) => `${name}=${content}`)
        .join("; "),
    },
    body: JSON.stringify(value),
  });
}
async function command(
  operation: string,
  value: unknown,
  requestId = randomUUID(),
) {
  const response = await client.rpc("h10_command", {
    p_organization_id: organization,
    p_request_id: requestId,
    p_operation: operation,
    p_input: asJson(value),
  });
  return z
    .object({ ok: z.literal(true), data: sunatCommandResultSchema })
    .parse(response.data).data;
}
async function processNext() {
  const tick = await admin.rpc("h10_worker_tick", {
    p_worker_id: randomUUID(),
    p_mode: "simulator",
    p_run_daily: false,
  });
  if (tick.error || !tick.data) throw new Error("H10_JOB_NOT_CLAIMED");
  const claim = claimedJobSchema.parse(tick.data);
  const keys = parseSunatKeyring(
    process.env.SUNAT_CREDENTIALS_CURRENT_KEY,
    process.env.SUNAT_CREDENTIALS_KEYS,
  );
  const status = await runClaimedSunatJob(
    claim,
    { client: admin, source: new SimulatorSunatSource(url!) },
    keys,
  );
  if (status !== "complete")
    throw new Error("H10_SIMULATOR_JOB_FAILED:" + claim.job.kind);
  return claim;
}
const rejectedOrigin = await api(
  "/api/sunat/credentials",
  input,
  "https://example.invalid",
);
if (rejectedOrigin.status !== 403) throw new Error("H10_ORIGIN_NOT_REJECTED");
checks.push("Credenciales: origen ajeno rechazado antes de guardar");
const savedResponse = await api("/api/sunat/credentials", input);
const saved = z
  .object({ ok: z.literal(true), data: sunatCommandResultSchema })
  .parse(await savedResponse.json()).data;
const repeatedResponse = await api("/api/sunat/credentials", input);
const repeated = z
  .object({ ok: z.literal(true), data: sunatCommandResultSchema })
  .parse(await repeatedResponse.json()).data;
if (saved.job_id !== repeated.job_id)
  throw new Error("H10_CREDENTIAL_RETRY_DUPLICATED");
checks.push("Guardado cifrado por endpoint e idempotencia ante reintento");
await processNext();
checks.push("Verificación de credenciales mediante worker local simulado");
const requestId = randomUUID();
const requests = await Promise.all([
  command("RequestSync", workspaceInput, requestId),
  command("RequestSync", workspaceInput, requestId),
]);
if (requests[0].job_id !== requests[1].job_id)
  throw new Error("H10_CONCURRENT_JOB_DUPLICATED");
const activeJob = await admin.rpc("h10_worker_tick", {
  p_worker_id: randomUUID(),
  p_mode: "simulator",
  p_run_daily: false,
});
const claim = claimedJobSchema.parse(activeJob.data);
const second = await admin.rpc("h10_worker_tick", {
  p_worker_id: randomUUID(),
  p_mode: "simulator",
  p_run_daily: false,
});
if (second.data !== null) throw new Error("H10_GLOBAL_LEASE_NOT_EXCLUSIVE");
const falseComplete = await admin.rpc("h10_worker_finish", {
  p_job_id: claim.job.id,
  p_lease_token: claim.job.lease_token,
  p_state: "complete",
  p_error_code: "",
  p_results: [],
  p_metrics: {},
});
if (!falseComplete.error) throw new Error("H10_FALSE_COMPLETENESS_ACCEPTED");
const keys = parseSunatKeyring(
  process.env.SUNAT_CREDENTIALS_CURRENT_KEY,
  process.env.SUNAT_CREDENTIALS_KEYS,
);
if (
  (await runClaimedSunatJob(
    claim,
    { client: admin, source: new SimulatorSunatSource(url) },
    keys,
  )) !== "complete"
)
  throw new Error("H10_MONTHLY_FAILED");
checks.push(
  "Consulta concurrente sin duplicados y exclusión global entre workers",
  "No permite certificar un mes sin verificar ambas bandejas",
);
const checkpointResponse = await admin
  .from("sunat_jobs")
  .select("checkpoint")
  .eq("id", claim.job.id)
  .single();
z.object({
  notifications: z.object({ complete: z.literal(true) }),
  messages: z.object({ complete: z.literal(true) }),
}).parse(checkpointResponse.data?.checkpoint);
checks.push("Conserva la continuación independiente de ambas bandejas");
const query = await client.rpc("h10_query", {
  p_organization_id: organization,
  p_resource: "messages",
  p_input: { ...workspaceInput, page: 1 },
});
const list = z
  .object({ ok: z.literal(true), data: sunatMessageListSchema })
  .parse(query.data).data;
if (list.rows.length !== 25 || list.count <= 25)
  throw new Error("H10_SERVER_PAGINATION_FAILED");
const otherPage = await client.rpc("h10_query", {
  p_organization_id: organization,
  p_resource: "messages",
  p_input: { ...workspaceInput, page: 2 },
});
const pageTwo = z
  .object({ ok: z.literal(true), data: sunatMessageListSchema })
  .parse(otherPage.data).data;
if (
  !pageTwo.rows.length ||
  pageTwo.rows.some((row) => list.rows.some((first) => first.id === row.id))
)
  throw new Error("H10_PAGE_OVERLAP");
checks.push("Paginación real de 25 antes de renderizar, sin filas repetidas");
const messageJob = await command("RequestMessage", {
  company_id: company.id,
  message_id: list.rows[0].id,
});
if (messageJob.job_id) await processNext();
const detailResponse = await client.rpc("h10_query", {
  p_organization_id: organization,
  p_resource: "message",
  p_input: { company_id: company.id, message_id: list.rows[0].id },
});
const detail = z
  .object({ ok: z.literal(true), data: sunatDetailSchema })
  .parse(detailResponse.data).data;
if (!detail.message.details_loaded_at || !detail.attachments.length)
  throw new Error("H10_MESSAGE_NOT_LOADED");
const attachmentJob = await command("RequestAttachment", {
  company_id: company.id,
  attachment_id: detail.attachments[0].id,
});
if (attachmentJob.job_id) await processNext();
const downloadResponse = await api("/api/sunat/download", {
  organization_id: organization,
  attachment_id: detail.attachments[0].id,
  request_id: randomUUID(),
});
const download = z
  .object({ ok: z.literal(true), data: z.object({ url: z.url() }) })
  .parse(await downloadResponse.json());
const file = await fetch(download.data.url);
if (!file.ok || !(await file.text()).startsWith("%PDF-"))
  throw new Error("H10_PDF_DOWNLOAD_FAILED");
checks.push(
  "Contenido bajo demanda y PDF privado descargado con autorización y URL de 60 segundos",
);
const rawFile = await client.storage.from("sunat-mailbox").list();
if (!rawFile.error && rawFile.data.length)
  throw new Error("H10_STORAGE_RAW_ACCESS");
const storedFile = await admin
  .from("sunat_attachments")
  .select("object_name")
  .eq("id", detail.attachments[0].id)
  .single();
const rawSigned = await client.storage
  .from("sunat-mailbox")
  .createSignedUrl(storedFile.data?.object_name ?? "invalid", 3600);
if (!rawSigned.error) throw new Error("H10_LONG_SIGNED_URL_ALLOWED");
checks.push("Storage no permite enumerar objetos privados desde el navegador");
const conn = await admin
  .from("sunat_connections")
  .select("revision,last_success_at")
  .eq("id", saved.resource_id)
  .single();
if (!conn.data) throw new Error("H10_CONNECTION_MISSING");
const schedule = await command("UpdateSchedule", {
  company_id: company.id,
  expected_revision: conn.data.revision,
  daily_enabled: true,
  daily_time: "00:00",
});
const lastDay = await admin
  .from("sunat_jobs")
  .select("daily_date")
  .eq("connection_id", saved.resource_id)
  .eq("kind", "daily")
  .order("daily_date", { ascending: false })
  .limit(1);
const day = new Date(
  Math.max(
    Date.now(),
    new Date(
      (lastDay.data?.[0]?.daily_date ?? "2000-01-01") + "T15:00:00Z",
    ).getTime(),
  ) + 86400000,
).toISOString();
const dailyResponse = await admin.rpc("h10_worker_tick", {
  p_worker_id: randomUUID(),
  p_mode: "simulator",
  p_run_daily: true,
  p_now: day,
});
const daily = claimedJobSchema.parse(dailyResponse.data);
const today = new Date().toISOString().slice(0, 10);
const dailyBatch = await admin.rpc("h10_worker_batch", {
  p_job_id: daily.job.id,
  p_lease_token: daily.job.lease_token,
  p_mailbox: "notifications",
  p_records: [
    {
      id: "simulator-daily-" + daily.job.id,
      published_on: today,
      subject: "Novedad ficticia diaria",
      read: false,
      has_attachments: false,
    },
  ],
  p_checkpoint: {},
  p_progress: {},
});
if (dailyBatch.error) throw new Error("H10_DAILY_BATCH_FAILED");
const dailyFinish = await admin.rpc("h10_worker_finish", {
  p_job_id: daily.job.id,
  p_lease_token: daily.job.lease_token,
  p_state: "complete",
  p_error_code: "",
  p_results: [
    { mailbox: "notifications", state: "complete" },
    { mailbox: "messages", state: "complete" },
  ],
  p_metrics: {},
});
if (dailyFinish.error) throw new Error("H10_DAILY_FINISH_FAILED");
const repeatedDaily = await admin.rpc("h10_worker_tick", {
  p_worker_id: randomUUID(),
  p_mode: "simulator",
  p_run_daily: true,
  p_now: day,
});
if (repeatedDaily.data !== null) throw new Error("H10_DAILY_DUPLICATED");
await command("UpdateSchedule", {
  company_id: company.id,
  expected_revision: schedule.revision,
  daily_enabled: false,
  daily_time: "08:00",
});
const notices = await admin
  .from("sunat_notifications")
  .select("id")
  .eq("connection_id", saved.resource_id)
  .eq(
    "event_key",
    "message:" +
      (
        await admin
          .from("sunat_messages")
          .select("id")
          .eq("source_id", "simulator-daily-" + daily.job.id)
          .single()
      ).data?.id,
  );
if (notices.error || notices.data.length !== 1)
  throw new Error("H10_DAILY_NOTIFICATION_DUPLICATED");
checks.push(
  "Revisión diaria sintética: novedad interna única y sin duplicar el trabajo del día",
);
const failedJob = await command("RequestSync", {
  company_id: company.id,
  year: 2026,
  month: 9,
});
const failedClaim = claimedJobSchema.parse(
  (
    await admin.rpc("h10_worker_tick", {
      p_worker_id: randomUUID(),
      p_mode: "simulator",
      p_run_daily: false,
    })
  ).data,
);
const partial = await admin.rpc("h10_worker_finish", {
  p_job_id: failedClaim.job.id,
  p_lease_token: failedClaim.job.lease_token,
  p_state: "partial",
  p_error_code: "PAGE_INCONSISTENT",
  p_results: [
    { mailbox: "notifications", state: "partial" },
    { mailbox: "messages", state: "partial" },
  ],
  p_metrics: {},
});
if (partial.error || !failedJob.job_id)
  throw new Error("H10_PARTIAL_NOT_RECORDED");
const retained = await admin
  .from("sunat_connections")
  .select("last_success_at")
  .eq("id", saved.resource_id)
  .single();
const periods = await client.rpc("h10_query", {
  p_organization_id: organization,
  p_resource: "workspace",
  p_input: { company_id: company.id, year: 2026, month: 9 },
});
const partialWorkspace = z
  .object({ ok: z.literal(true), data: sunatWorkspaceSchema })
  .parse(periods.data).data;
if (
  !retained.data?.last_success_at ||
  !partialWorkspace.months.every((item) => item.state === "partial")
)
  throw new Error("H10_PARTIAL_MISREPORTED");
checks.push(
  "Una página inconsistente conserva el resultado anterior y registra el mes incompleto",
);
const invalidResume = await client.rpc("h10_command", {
  p_organization_id: organization,
  p_request_id: randomUUID(),
  p_operation: "ResumeSync",
  p_input: { company_id: company.id, year: 2026, month: 9 },
});
if (z.object({ ok: z.boolean() }).parse(invalidResume.data).ok)
  throw new Error("H10_INCONSISTENT_RESUME_ACCEPTED");
await command("RequestSync", { company_id: company.id, year: 2026, month: 9 });
const boundedClaim = claimedJobSchema.parse(
  (
    await admin.rpc("h10_worker_tick", {
      p_worker_id: randomUUID(),
      p_mode: "simulator",
      p_run_daily: false,
    })
  ).data,
);
const boundedSource = new SimulatorSunatSource(url);
await boundedSource.connect({
  ruc: company.ruc,
  username: "simulator-bounded",
  password: "fictional",
});
const bounded = await runMonthlyMailboxQuery(
  {
    connection_key: boundedClaim.job.connection_id,
    mailbox: "notifications",
    from: "2026-09-01",
    through: "2026-09-30",
    read_effect_consent: {
      accepted: true,
      warning_version: 1,
      accepted_at: new Date().toISOString(),
    },
    limits: {
      max_pages: 1,
      max_requests: 3,
      max_duration_ms: 15000,
      max_attempts_per_page: 1,
      request_timeout_ms: 10000,
    },
  },
  {
    transport: boundedSource,
    checkpoints: workerCheckpointStore(admin, boundedClaim, boundedSource),
  },
);
if (bounded.reason !== "BUDGET_EXHAUSTED")
  throw new Error("H10_BOUNDARY_NOT_REACHED");
await boundedSource.close();
const boundedFinish = await admin.rpc("h10_worker_finish", {
  p_job_id: boundedClaim.job.id,
  p_lease_token: boundedClaim.job.lease_token,
  p_state: "partial",
  p_error_code: "BUDGET_EXHAUSTED",
  p_results: [
    { mailbox: "notifications", state: "partial" },
    { mailbox: "messages", state: "partial" },
  ],
  p_metrics: {},
});
if (boundedFinish.error) throw new Error("H10_BOUNDARY_NOT_STORED");
await command("ResumeSync", { company_id: company.id, year: 2026, month: 9 });
await processNext();
checks.push(
  "Continúa desde un cursor durable y rechaza continuar páginas inconsistentes",
);
const identities = z
  .array(
    z.object({
      email: z.email(),
      password: z.string(),
      memberType: z.string(),
      roleCode: z.string(),
    }),
  )
  .parse(
    JSON.parse(readFileSync("test-results/local/h02-fixtures.json", "utf8")),
  );
for (const identity of identities) {
  const account = createClient<Database>(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const login = await account.auth.signInWithPassword(identity);
  if (login.error) throw new Error("H10_PROFILE_LOGIN_FAILED");
  const profileResponse = await account.rpc("h02_context");
  const profile = z
    .object({ ok: z.literal(true), data: sessionContextSchema })
    .parse(profileResponse.data).data;
  const denied = await account.rpc("h10_query", {
    p_organization_id: organization,
    p_resource: "workspace",
    p_input: workspaceInput,
  });
  if (z.object({ ok: z.boolean() }).parse(denied.data).ok)
    throw new Error("H10_ACCESS_WITHOUT_GRANT");
  if (identity.memberType === "client") {
    checks.push("Cliente sin acceso incluso con empresa documental asignada");
    continue;
  }
  const currentGrant = await admin
    .from("sunat_access_grants")
    .select("revision")
    .eq("company_id", company.id)
    .eq("member_id", profile.member.id)
    .maybeSingle();
  const grant = await command("SetAccess", {
    company_id: company.id,
    member_id: profile.member.id,
    allowed: true,
    expected_revision: currentGrant.data?.revision ?? 0,
  });
  const allowed = await account.rpc("h10_query", {
    p_organization_id: organization,
    p_resource: "workspace",
    p_input: workspaceInput,
  });
  if (!z.object({ ok: z.boolean() }).parse(allowed.data).ok)
    throw new Error("H10_GRANTED_ACCESS_DENIED");
  const foreign = context.companies.find(
    (item) => item.id !== company.id && item.status === "active",
  );
  const foreignResult = await account.rpc("h10_query", {
    p_organization_id: organization,
    p_resource: "workspace",
    p_input: { company_id: foreign?.id },
  });
  if (z.object({ ok: z.boolean() }).parse(foreignResult.data).ok)
    throw new Error("H10_FOREIGN_COMPANY_ACCESS");
  const unauthorizedWrite = await account.rpc("h10_command", {
    p_organization_id: organization,
    p_request_id: randomUUID(),
    p_operation: "Disconnect",
    p_input: { company_id: company.id, expected_revision: 0 },
  });
  if (z.object({ ok: z.boolean() }).parse(unauthorizedWrite.data).ok)
    throw new Error("H10_INTERNAL_CAN_MANAGE_CREDENTIALS");
  const inFlight = await account.rpc("h10_command", {
    p_organization_id: organization,
    p_request_id: randomUUID(),
    p_operation: "RequestSync",
    p_input: { company_id: company.id, year: 2026, month: 8 },
  });
  z.object({ ok: z.literal(true) }).parse(inFlight.data);
  const revokedClaim = claimedJobSchema.parse(
    (
      await admin.rpc("h10_worker_tick", {
        p_worker_id: randomUUID(),
        p_mode: "simulator",
        p_run_daily: false,
      })
    ).data,
  );
  await command("SetAccess", {
    company_id: company.id,
    member_id: profile.member.id,
    allowed: false,
    expected_revision: grant.revision,
  });
  if (
    (await runClaimedSunatJob(
      revokedClaim,
      { client: admin, source: new SimulatorSunatSource(url) },
      keys,
    )) !== "failed"
  )
    throw new Error("H10_REVOKED_WORKER_PERSISTED");
  const revoked = await account
    .from("sunat_messages")
    .select("id")
    .eq("company_id", company.id);
  if (revoked.error || revoked.data.length)
    throw new Error("H10_RLS_REVOCATION_FAILED");
  const token = login.data.session?.access_token;
  const revokedSession = await account.auth.signOut({ scope: "local" });
  if (revokedSession.error) throw new Error("H10_SESSION_REVOCATION_FAILED");
  if (!token) throw new Error("H10_SESSION_TOKEN_MISSING");
  const revokedClient = createClient<Database>(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: "Bearer " + token } },
  });
  const revokedQuery = await revokedClient.rpc("h10_query", {
    p_organization_id: organization,
    p_resource: "alerts",
    p_input: {},
  });
  if (z.object({ ok: z.boolean() }).parse(revokedQuery.data).ok)
    throw new Error("H10_REVOKED_SESSION_ACCEPTED");
  checks.push(
    `Acceso explícito, administración restringida y revocación inmediata: ${identity.roleCode}`,
    `Empresa ajena y sesión revocada rechazadas: ${identity.roleCode}`,
    `Acceso revocado con trabajo reclamado: descarta escrituras de ${identity.roleCode}`,
  );
}
const beforeDisconnect = await admin
  .from("sunat_connections")
  .select("revision")
  .eq("id", saved.resource_id)
  .single();
await command("Disconnect", {
  company_id: company.id,
  expected_revision: beforeDisconnect.data?.revision,
});
const history = await client.rpc("h10_query", {
  p_organization_id: organization,
  p_resource: "messages",
  p_input: workspaceInput,
});
if (
  !z
    .object({ ok: z.literal(true), data: sunatMessageListSchema })
    .parse(history.data).data.rows.length
)
  throw new Error("H10_DISCONNECT_LOST_HISTORY");
const afterDisconnect = await admin
  .from("sunat_connections")
  .select("revision,state,daily_enabled")
  .eq("id", saved.resource_id)
  .single();
if (
  afterDisconnect.data?.state !== "disconnected" ||
  afterDisconnect.data.daily_enabled
)
  throw new Error("H10_DISCONNECT_INCOMPLETE");
const restored = await api("/api/sunat/credentials", {
  ...input,
  request_id: randomUUID(),
  expected_revision: afterDisconnect.data.revision,
});
z.object({ ok: z.literal(true), data: sunatCommandResultSchema }).parse(
  await restored.json(),
);
await processNext();
checks.push(
  "Desconectar detiene la operación y conserva mensajes; reconexión con credenciales nuevas",
);
writeFileSync(
  "test-results/local/h10-live.json",
  JSON.stringify(
    {
      environment: "Docker 54431 / aplicación 4003",
      synthetic: true,
      checks,
      passed: checks.length,
    },
    null,
    2,
  ),
);
console.log(`H10 Docker: ${checks.length} comprobaciones satisfactorias.`);
