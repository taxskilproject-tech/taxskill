import { expect, it } from "vitest";

import type { SessionContext } from "@/features/auth/types/auth.types";
import { canReviewScope } from "@/features/auth/utils/review-access";
import { safeReturnTo } from "@/features/auth/utils/safe-return-to";

import {
  moduleCompanyA,
  moduleCompanyB,
  moduleContext,
} from "./fixtures/module-navigation";

it("prioriza revisión solamente en empresas autorizadas y nunca para clientes", () => {
  const reviewer: SessionContext = {
    ...moduleContext,
    capabilities: [
      ...moduleContext.capabilities,
      { company_id: moduleCompanyA, module: "tributario", action: "approve" },
    ],
  };
  expect(
    canReviewScope(reviewer, { kind: "company", companyId: moduleCompanyA }),
  ).toBe(true);
  expect(
    canReviewScope(reviewer, { kind: "company", companyId: moduleCompanyB }),
  ).toBe(false);
  expect(canReviewScope(reviewer, { kind: "internal" })).toBe(false);
  expect(
    canReviewScope(
      { ...reviewer, member: { ...reviewer.member, member_type: "client" } },
      { kind: "all" },
    ),
  ).toBe(false);
});
it("mantiene filtros y página de configuración en el retorno sin conservar contraseñas", () => {
  const address =
    "/configuracion?tab=reglas&rulesQuery=mensual&rulesModule=tributario&rulesPage=2&password=private";
  expect(safeReturnTo(address)).toBe(address.replace("&password=private", ""));
});
