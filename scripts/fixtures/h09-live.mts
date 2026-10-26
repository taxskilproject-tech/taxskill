import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { sessionContextSchema } from "../../src/features/auth/contracts/session.schema";
import type { Database } from "../../src/lib/supabase/types/database.types";
import { loadH09LabEnvironment } from "../utils/h09-lab-environment";

const env = loadH09LabEnvironment(); // Rejects Cloud and verifies the isolated Docker container before any request.
const credentials = z
  .object({ BOOTSTRAP_EMAIL: z.email(), BOOTSTRAP_PASSWORD: z.string() })
  .parse(parseEnv(readFileSync(".envs/local/bootstrap.env", "utf8")));
const identities = z
  .array(
    z.object({
      email: z.email(),
      password: z.string(),
      fullName: z.string(),
      memberType: z.enum(["internal", "client"]),
      roleCode: z.string(),
    }),
  )
  .parse(
    JSON.parse(readFileSync("test-results/local/h02-fixtures.json", "utf8")),
  );
const cookies = new Map<string, string>();
const client = createServerClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  {
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: (entries) =>
        entries.forEach(({ name, value }) => cookies.set(name, value)),
    },
  },
);
const login = await client.auth.signInWithPassword({
  email: credentials.BOOTSTRAP_EMAIL,
  password: credentials.BOOTSTRAP_PASSWORD,
});
if (login.error) throw new Error("No se pudo ingresar al laboratorio H09.");
const contextResult = await client.rpc("h02_context");
const context = z
  .object({ ok: z.literal(true), data: sessionContextSchema })
  .parse(contextResult.data).data;
const admin = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const company = await admin
  .from("companies")
  .select("id")
  .eq("ruc", "20000000901")
  .single();
const roles = await admin
  .from("roles")
  .select("*")
  .eq("organization_id", context.organization.id)
  .is("deleted_at", null);
if (!company.data || !roles.data) throw new Error("Faltan las fixtures H09.");
const checks: string[] = [];
const published = await admin
  .from("deliverable_templates")
  .select("published_version_id")
  .eq("organization_id", context.organization.id)
  .eq("regime_code", "rg")
  .single();
if (!published.data?.published_version_id)
  throw new Error("Falta la publicación RG ficticia.");
const concurrentRequest = randomUUID();
const companyInput = {
  ruc: "209" + Date.now().toString().slice(-8),
  legal_name: "H09 · Concurrencia · Docker",
  control_start_date: new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()),
  status: "active",
  tax_regime_code: "rg",
  document_template_version_id: published.data.published_version_id,
  documentary_profile: {
    schema_version: 1,
    plame: false,
    afp: false,
    igv_renta: true,
    health_coverage: "none",
  },
};
const concurrent = await Promise.all(
  [0, 1].map(() =>
    client.rpc("h02_command", {
      p_organization_id: context.organization.id,
      p_request_id: concurrentRequest,
      p_operation: "CreateOrUpdateCompany",
      p_input: companyInput,
    }),
  ),
);
const createdIds = concurrent.map(
  (response) =>
    z
      .object({
        ok: z.literal(true),
        data: z.object({ resource_id: z.uuid() }),
      })
      .parse(response.data).data.resource_id,
);
if (createdIds[0] !== createdIds[1])
  throw new Error("El alta concurrente duplicó una empresa.");
const copied = await admin
  .from("requirement_rules")
  .select("id,preparation_pending")
  .eq("company_id", createdIds[0]);
if (
  copied.data?.length !== 7 ||
  !copied.data.every((item) => item.preparation_pending)
)
  throw new Error("La copia concurrente no fue atómica.");
checks.push(
  "Dos solicitudes concurrentes devuelven una misma empresa",
  "Siete entregables iniciales sin duplicados y pendientes de responsable",
);
const buckets = await admin.storage.listBuckets();
if (buckets.error)
  throw new Error("No se pudieron consultar los buckets locales.");
for (const bucket of ["documents", "document-reception"]) {
  if (buckets.data.some((item) => item.id === bucket)) continue;
  const created = await admin.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: 50_000_000,
  });
  if (created.error)
    throw new Error("No se pudo preparar el almacenamiento privado local.");
}
async function ensureAccountCreated(response: Response) {
  const payload = z
    .object({
      ok: z.boolean(),
      error: z.object({ code: z.string() }).optional(),
    })
    .parse(await response.json());
  if (!response.ok || !payload.ok)
    throw new Error(
      "Alta ficticia H09: " + (payload.error?.code ?? response.status),
    );
}

for (const identity of identities) {
  const role = roles.data.find((item) => item.code === identity.roleCode);
  if (!role) throw new Error("Falta un rol de prueba.");
  const existing = await admin
    .from("profiles")
    .select("user_id")
    .eq("email", identity.email)
    .maybeSingle();
  if (!existing.data) {
    const response = await fetch(env.APP_BASE_URL + "/api/admin/users", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: env.APP_BASE_URL,
        cookie: [...cookies]
          .map(([name, value]) => `${name}=${value}`)
          .join("; "),
      },
      body: JSON.stringify({
        organization_id: context.organization.id,
        request_id: randomUUID(),
        input: {
          email: identity.email,
          password: identity.password,
          full_name: identity.fullName,
          member_type: identity.memberType,
          is_admin: false,
          grants: [
            {
              scope: "company",
              company_id: company.data.id,
              module: "tributario",
              role_id: role.id,
              active: true,
              overrides: [],
            },
          ],
        },
      }),
    });
    await ensureAccountCreated(response);
  }
  const user = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const signed = await user.auth.signInWithPassword({
    email: identity.email,
    password: identity.password,
  });
  if (signed.error) throw new Error("Ingreso ficticio H09 fallido.");
  const session = await user.rpc("h02_context");
  z.object({ ok: z.literal(true), data: sessionContextSchema }).parse(
    session.data,
  );
  checks.push(`Ingreso y contexto admitido: ${identity.roleCode}`);
  const templates = await user.rpc("h03_query", {
    p_organization_id: context.organization.id,
    p_resource: "deliverable_templates",
    p_input: {},
  });
  if (templates.error?.message !== "FORBIDDEN")
    throw new Error("El perfil no administrativo accedió a plantillas.");
  checks.push(`Plantillas administrativas restringidas: ${identity.roleCode}`);
}
const edge = parseEnv(readFileSync(".envs/local/edge.env", "utf8"));
writeFileSync(
  "test-results/local/h09-lab/edge.env",
  `APP_BASE_URL=${env.APP_BASE_URL}\nH03_PUBLIC_SUPABASE_URL=${env.NEXT_PUBLIC_SUPABASE_URL}\nH03_CLEANUP_SECRET=${edge.H03_CLEANUP_SECRET}\n`,
);
writeFileSync(
  "test-results/local/h09-lab/live.json",
  JSON.stringify({ generated_at: new Date().toISOString(), checks }, null, 2),
);
console.log(
  `H09: ${checks.length} comprobaciones de acceso aprobadas en Docker.`,
);
