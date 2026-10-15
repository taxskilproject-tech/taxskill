import { expect, it } from "vitest";

import {
  createScopedQueryKey,
  createScopeIdentity,
} from "@/lib/query/utils/query-keys";

import {
  companyScope,
  otherCompanyScope,
  otherUserScope,
} from "./fixtures/scopes";

it("separa caché por usuario, estudio, empresa y módulo", () => {
  const original = createScopeIdentity(companyScope);
  expect(createScopeIdentity(otherUserScope)).not.toBe(original);
  expect(createScopeIdentity(otherCompanyScope)).not.toBe(original);
  expect(
    createScopeIdentity({ ...companyScope, organizationId: "otro-estudio" }),
  ).not.toBe(original);
  expect(
    createScopeIdentity({ ...companyScope, module: "laboral_general" }),
  ).not.toBe(original);
  expect(
    createScopeIdentity({ ...companyScope, company: { kind: "internal" } }),
  ).not.toBe(original);
});

it("normaliza filtros y excluye indefinidos sin mutar la entrada", () => {
  const filters = Object.freeze({
    page: 1,
    query: undefined,
    module: "tributario",
  });
  expect(createScopedQueryKey(companyScope, "obligations", filters)).toEqual(
    createScopedQueryKey(companyScope, "obligations", {
      module: "tributario",
      page: 1,
    }),
  );
  expect(filters.query).toBeUndefined();
});

it("rechaza claves de consulta con credenciales o URLs firmadas", () => {
  expect(() =>
    createScopedQueryKey(companyScope, "documents", { token: "privado" }),
  ).toThrow();
  expect(() =>
    createScopedQueryKey(companyScope, "documents", { signedUrl: "privado" }),
  ).toThrow();
  expect(() => createScopedQueryKey(companyScope, "")).toThrow();
});
