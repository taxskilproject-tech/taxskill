import { describe, expect, it } from "vitest";

import {
  companySchema,
  createUserSchema,
  grantSchema,
  organizationSettingsSchema,
} from "@/domain/access/contracts/access.schema";
import {
  canPerform,
  resolvePermission,
} from "@/domain/access/utils/permissions";
import { safeReturnTo } from "@/features/auth/utils/safe-return-to";
import { isSameOrigin } from "@/features/users/utils/is-same-origin";

const company = {
  ruc: "20000000001",
  legal_name: "Fixture",
  status: "active",
  control_start_date: "2028-02-29",
};
const id = "11111111-1111-4111-8111-111111111111";

describe("validación de H02", () => {
  it("valida RUC y fechas civiles sin desplazar días", () => {
    expect(companySchema.safeParse(company).success).toBe(true);
    expect(companySchema.safeParse({ ...company, ruc: "123" }).success).toBe(
      false,
    );
    expect(
      companySchema.safeParse({ ...company, control_start_date: "2027-02-29" })
        .success,
    ).toBe(false);
  });
  it("rechaza administración para cliente y contraseñas insuficientes", () => {
    const user = {
      email: "client@example.test",
      full_name: "Cliente",
      password: "Sufficient-Password-22",
      member_type: "client",
      is_admin: false,
      grants: [],
    };
    expect(createUserSchema.safeParse(user).success).toBe(true);
    expect(
      createUserSchema.safeParse({ ...user, is_admin: true }).success,
    ).toBe(false);
    expect(
      createUserSchema.safeParse({ ...user, password: "short" }).success,
    ).toBe(false);
  });
  it("limita el alcance interno a Actividades sin empresa", () => {
    const grant = {
      member_id: id,
      scope: "organization",
      company_id: null,
      module: "actividades",
      role_id: id,
      active: true,
      overrides: [],
    };
    expect(grantSchema.safeParse(grant).success).toBe(true);
    expect(
      grantSchema.safeParse({ ...grant, module: "tributario" }).success,
    ).toBe(false);
    expect(grantSchema.safeParse({ ...grant, company_id: id }).success).toBe(
      false,
    );
  });
  it("valida parámetros y umbrales", () => {
    const settings = {
      schema_version: 1,
      upcoming_days: 7,
      digest_local_time: "09:00",
      generation_local_time: "00:05",
      default_max_file_bytes: 20000000,
      allowed_formats: ["pdf"],
      compliance_thresholds: { green: 90, yellow: 70 },
    };
    expect(organizationSettingsSchema.safeParse(settings).success).toBe(true);
    expect(
      organizationSettingsSchema.safeParse({
        ...settings,
        allowed_formats: ["pdf", "pdf"],
      }).success,
    ).toBe(false);
    expect(
      organizationSettingsSchema.safeParse({
        ...settings,
        compliance_thresholds: { green: 70, yellow: 90 },
      }).success,
    ).toBe(false);
  });
});

describe("permisos funcionales", () => {
  it("la excepción explícita prevalece y por defecto se deniega", () => {
    expect(resolvePermission(true, false, "upload", "internal")).toBe(false);
    expect(resolvePermission(false, true, "upload", "internal")).toBe(true);
    expect(resolvePermission(false, undefined, "view", "internal")).toBe(false);
    expect(resolvePermission(false, true, "approve", "client")).toBe(false);
  });
  it("no mezcla empresa, módulo ni alcance interno", () => {
    const capabilities = [
      { company_id: id, module: "tributario", action: "view" },
    ] as const;
    expect(canPerform(capabilities, id, "tributario", "view", "client")).toBe(
      true,
    );
    expect(
      canPerform(capabilities, id, "laboral_general", "view", "client"),
    ).toBe(false);
    expect(canPerform(capabilities, null, "tributario", "view", "client")).toBe(
      false,
    );
  });
});

describe("navegación y CSRF", () => {
  it.each([
    "https://foreign.invalid",
    "//foreign.invalid",
    "/\\foreign.invalid",
    "/login",
    "/empresas/invalid",
  ])("descarta destino externo o desconocido %s", (value) =>
    expect(safeReturnTo(value)).toBe("/dashboard"),
  );
  it("conserva parámetros de navegación y retira secretos", () =>
    expect(safeReturnTo("/empresas?q=demo&token=private")).toBe(
      "/empresas?q=demo",
    ));
  it("acepta el Host local que Next canonicaliza", () => {
    const request = new Request("http://localhost:3001/api/admin/users", {
      headers: { Origin: "http://127.0.0.1:3001", Host: "127.0.0.1:3001" },
    });
    expect(isSameOrigin(request)).toBe(true);
  });
  it.each([
    undefined,
    "https://foreign.invalid",
    "https://localhost:3001",
    "http://localhost:3001/path",
  ])("rechaza origen incompatible %s", (origin) => {
    expect(
      isSameOrigin(
        new Request("http://localhost:3001/api/admin/users", {
          headers: origin ? { Origin: origin } : {},
        }),
      ),
    ).toBe(false);
  });
});
