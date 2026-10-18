import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import { isLocalSupabaseUrl } from "../../../src/config/env/utils/is-local-supabase-url";
import type { AppSupabaseClient } from "../../../src/lib/supabase/types/client.types";
import type { Database } from "../../../src/lib/supabase/types/database.types";
import { scriptResult } from "../../utils/script-result";

async function createIdentity(
  admin: AppSupabaseClient,
  url: string,
  label: string,
) {
  const password = randomBytes(24).toString("base64url");
  const created = await admin.auth.admin.createUser({
    email: `h08-${label}-${randomUUID()}@example.test`,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user)
    throw new Error("No se pudo preparar identidad local H08.");
  const user = created.data.user;
  const profile = await admin.from("profiles").insert({
    user_id: user.id,
    email: user.email ?? "",
    full_name: `H08 ${label}`,
    provisioning_status: "ready",
  });
  if (profile.error) throw new Error("No se pudo preparar perfil local H08.");
  const client = createClient<Database>(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    { auth: { persistSession: false } },
  );
  return { user, password, client };
}
export async function createSecurityFixture(url: string) {
  if (!isLocalSupabaseUrl(url))
    throw new Error("Fixtures H08 bloqueados fuera de Docker local.");
  const admin = createClient<Database>(
    url,
    process.env.SUPABASE_SECRET_KEY ?? "",
    { auth: { persistSession: false } },
  );
  const owner = await createIdentity(admin, url, "owner");
  const limited = await createIdentity(admin, url, "client");
  const other = await createIdentity(admin, url, "other");
  const org = scriptResult(
    await admin
      .from("organizations")
      .insert({ name: "H08 API local" })
      .select()
      .single(),
    "No se pudo crear estudio H08.",
  );
  const foreignOrg = scriptResult(
    await admin
      .from("organizations")
      .insert({ name: "H08 API otro estudio" })
      .select()
      .single(),
    "No se pudo crear otro estudio H08.",
  );
  const memberships = await admin
    .from("organization_members")
    .insert([
      {
        organization_id: org.id,
        user_id: owner.user.id,
        member_type: "internal",
        is_admin: true,
      },
      {
        organization_id: org.id,
        user_id: limited.user.id,
        member_type: "client",
        is_admin: false,
      },
      {
        organization_id: foreignOrg.id,
        user_id: other.user.id,
        member_type: "internal",
        is_admin: true,
      },
    ])
    .select();
  const member = scriptResult(
    memberships,
    "No se pudieron crear membresías H08.",
  ).find((entry) => entry.user_id === limited.user.id);
  if (!member) throw new Error("Membresía H08 no disponible.");
  const companies = scriptResult(
    await admin
      .from("companies")
      .insert([
        {
          organization_id: org.id,
          ruc: "20999999891",
          legal_name: "H08 API A",
          control_start_date: "2026-10-17",
        },
        {
          organization_id: org.id,
          ruc: "20999999892",
          legal_name: "H08 API B",
          control_start_date: "2026-10-17",
        },
        {
          organization_id: foreignOrg.id,
          ruc: "20999999891",
          legal_name: "H08 API ajena",
          control_start_date: "2026-10-17",
        },
      ])
      .select(),
    "No se pudieron crear empresas H08.",
  );
  const companyA = companies.find(
    (entry) => entry.organization_id === org.id && entry.ruc === "20999999891",
  );
  const companyB = companies.find(
    (entry) => entry.organization_id === org.id && entry.ruc === "20999999892",
  );
  if (!companyA || !companyB) throw new Error("Empresas H08 no disponibles.");
  const role = scriptResult(
    await admin
      .from("roles")
      .insert({
        organization_id: org.id,
        code: "h08_client",
        name: "H08 cliente",
        audience: "client",
      })
      .select()
      .single(),
    "Rol H08 no disponible.",
  );
  const permissions = scriptResult(
    await admin
      .from("permissions")
      .insert([
        {
          organization_id: org.id,
          module: "tributario",
          action: "view",
          description: "H08 tax",
        },
        {
          organization_id: org.id,
          module: "laboral_trabajador",
          action: "view",
          description: "H08 labor",
        },
      ])
      .select(),
    "Permisos H08 no disponibles.",
  );
  const relation = await admin.from("role_permissions").insert(
    permissions.map((permission) => ({
      organization_id: org.id,
      role_id: role.id,
      permission_id: permission.id,
    })),
  );
  if (relation.error) throw new Error("No se pudo preparar el rol H08.");
  const grants = scriptResult(
    await admin
      .from("access_grants")
      .insert([
        {
          organization_id: org.id,
          member_id: member.id,
          scope: "company",
          company_id: companyA.id,
          module: "tributario",
          role_id: role.id,
        },
        {
          organization_id: org.id,
          member_id: member.id,
          scope: "company",
          company_id: companyB.id,
          module: "laboral_trabajador",
          role_id: role.id,
        },
      ])
      .select(),
    "Asignaciones H08 no disponibles.",
  );
  const workers = await admin.from("workers").insert([
    {
      organization_id: org.id,
      company_id: companyA.id,
      identity_type: "DNI",
      identity_number: "90000091",
      first_names: "H08",
      last_names: "Oculto",
    },
    {
      organization_id: org.id,
      company_id: companyB.id,
      identity_type: "DNI",
      identity_number: "90000092",
      first_names: "H08",
      last_names: "Visible",
    },
  ]);
  if (workers.error)
    throw new Error("No se pudieron preparar trabajadores H08.");
  return {
    admin,
    owner,
    limited,
    other,
    org,
    foreignOrg,
    companyA,
    companyB,
    member,
    grants,
  };
}
