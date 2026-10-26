import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { DOCUMENT_CATALOG_TEMPLATES } from "../../src/domain/documents/constants/catalog-templates";
import { deliverableTemplatesSchema } from "../../src/domain/documents/contracts/template.schema";
import type {
  Database,
  Json,
} from "../../src/lib/supabase/types/database.types";
import { loadH09LabEnvironment } from "../utils/h09-lab-environment";

const environment = loadH09LabEnvironment();
const bootstrap = z
  .object({ BOOTSTRAP_EMAIL: z.email(), BOOTSTRAP_PASSWORD: z.string() })
  .parse(parseEnv(readFileSync(".envs/local/bootstrap.env", "utf8")));
const client = createClient<Database>(
  environment.NEXT_PUBLIC_SUPABASE_URL,
  environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const login = await client.auth.signInWithPassword({
  email: bootstrap.BOOTSTRAP_EMAIL,
  password: bootstrap.BOOTSTRAP_PASSWORD,
});
if (login.error)
  throw new Error("No se pudo ingresar con la identidad ficticia H09.");
const context = await client.rpc("h02_context");
const data = z
  .object({
    ok: z.literal(true),
    data: z.object({
      organization: z.object({ id: z.uuid() }),
      member: z.object({ id: z.uuid() }),
    }),
  })
  .parse(context.data).data;
const org = data.organization.id;
async function command(operation: string, input: Json) {
  const response = await client.rpc("h02_command", {
    p_organization_id: org,
    p_request_id: randomUUID(),
    p_operation: operation,
    p_input: input,
  });
  if (response.error) throw new Error(`H09 ${operation}: error de transporte.`);
  const result = z
    .object({
      ok: z.boolean(),
      data: z.object({ resource_id: z.uuid() }).passthrough().optional(),
      error: z.object({ code: z.string() }).optional(),
    })
    .parse(response.data);
  if (!result.ok || !result.data)
    throw new Error(
      `H09 ${operation}: ${result.error?.code ?? "resultado inválido"}`,
    );
  return result.data.resource_id;
}
async function templates() {
  const response = await client.rpc("h03_query", {
    p_organization_id: org,
    p_resource: "deliverable_templates",
    p_input: {},
  });
  if (response.error) throw new Error("Consulta de plantillas fallida.");
  return z
    .object({ ok: z.literal(true), data: deliverableTemplatesSchema })
    .parse(response.data).data.rows;
}
await command("InitializeDeliverableTemplates", {
  templates: DOCUMENT_CATALOG_TEMPLATES,
});
let template = (await templates()).find((item) => item.regime_code === "rg");
if (!template) throw new Error("Falta el régimen RG de prueba.");
if (!template.published) {
  const items = template.latest.items.map((item) => ({
    ...item,
    configuration: {
      ...item.configuration,
      frequency: item.configuration.frequency ?? "mensual",
      deadline_offset_days: 2,
    },
  }));
  await command("SaveDeliverableTemplate", {
    template_id: template.id,
    version_id: template.latest.id,
    expected_revision: template.latest.revision,
    items,
  });
  template = (await templates()).find((item) => item.regime_code === "rg");
  if (!template) throw new Error("Falta la plantilla guardada.");
  if (template.latest.issues.length)
    throw new Error(
      "La plantilla de prueba contiene faltantes: " +
        template.latest.issues.map((item) => item.message).join("; "),
    );
  await command("PublishDeliverableTemplate", {
    template_id: template.id,
    version_id: template.latest.id,
    expected_revision: template.latest.revision,
  });
}
template = (await templates()).find((item) => item.regime_code === "rg");
if (!template?.published)
  throw new Error("La plantilla de prueba no se publicó.");
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Lima",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const variants = [
  {
    ruc: "20000000901",
    name: "H09 · Tributario · pendiente",
    plame: false,
    afp: false,
    igv_renta: true,
    health_coverage: "none",
  },
  {
    ruc: "20000000902",
    name: "H09 · Laboral · EsSalud sin AFP",
    plame: true,
    afp: false,
    igv_renta: false,
    health_coverage: "essalud",
  },
  {
    ruc: "20000000903",
    name: "H09 · Laboral · SIS y AFP",
    plame: true,
    afp: true,
    igv_renta: false,
    health_coverage: "sis",
  },
];
const results = [];
for (const variant of variants) {
  const found = await client
    .from("companies")
    .select("id")
    .eq("organization_id", org)
    .eq("ruc", variant.ruc)
    .maybeSingle();
  if (found.error) throw new Error("Consulta de empresa ficticia fallida.");
  const id =
    found.data?.id ??
    (await command("CreateOrUpdateCompany", {
      ruc: variant.ruc,
      legal_name: variant.name,
      control_start_date: today,
      status: "active",
      tax_regime_code: "rg",
      tax_regime: "RG - Régimen General",
      document_template_version_id: template.published.id,
      documentary_profile: {
        schema_version: 1,
        plame: variant.plame,
        afp: variant.afp,
        igv_renta: variant.igv_renta,
        health_coverage: variant.health_coverage,
      },
    }));
  const rules = await client
    .from("requirement_rules")
    .select("id,module,preparation_pending")
    .eq("company_id", id)
    .is("deleted_at", null);
  if (rules.error) throw new Error("Consulta de preparación fallida.");
  results.push({
    company_id: id,
    name: variant.name,
    deliverables: rules.data.length,
    pending: rules.data.filter((item) => item.preparation_pending).length,
  });
}
writeFileSync(
  "test-results/local/h09-lab/demo.json",
  JSON.stringify(
    {
      organization_id: org,
      template_version_id: template.published.id,
      companies: results,
    },
    null,
    2,
  ),
  "utf8",
);
console.info(
  JSON.stringify({ local: true, cloud_changed: false, companies: results }),
);
await client.auth.signOut({ scope: "local" });
