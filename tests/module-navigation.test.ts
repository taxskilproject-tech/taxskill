import { expect, it } from "vitest";

import {
  companyChangeDestination,
  selectedCompany,
} from "@/features/auth/utils/company-navigation";
import {
  documentaryModule,
  moduleCompanies,
  moduleDestination,
} from "@/features/auth/utils/module-navigation";
import { workspaceNavigation } from "@/features/auth/utils/workspace-navigation";
import {
  activeNavigation,
  workspaceRoute,
} from "@/features/auth/utils/workspace-route";

import {
  moduleCompanyA,
  moduleCompanyB,
  moduleContext,
} from "./fixtures/module-navigation";

it("los accesos respetan empresa y permisos sin conceder acceso por pertenecer al menú", () => {
  expect(
    workspaceNavigation(moduleContext)
      .filter((item) => item.group === "Módulos")
      .map((item) => item.id),
  ).toEqual(["tributario", "laboral_trabajador"]);
  const entries = workspaceNavigation(moduleContext, {
    kind: "company",
    companyId: moduleCompanyA,
  });
  expect(entries.find((item) => item.id === "tributario")?.href).toBe(
    moduleDestination("tributario", moduleCompanyA),
  );
  expect(entries.some((item) => item.id === "laboral_trabajador")).toBe(false);
  expect(
    moduleCompanies(moduleContext, "laboral_trabajador").map((item) => item.id),
  ).toEqual([moduleCompanyB]);
  expect(documentaryModule("actividades")).toBeNull();
  expect(documentaryModule("unknown")).toBeNull();
});

it("el selector exige elección explícita incluso si solo hay una empresa elegible", () => {
  const route = workspaceRoute(
    "/empresas",
    new URLSearchParams("module=tributario"),
  );
  expect(route.picker).toBe(true);
  expect(selectedCompany(moduleContext, moduleCompanyA, route)).toBe("all");
  expect(moduleDestination("tributario")).toBe("/empresas?module=tributario");
  const inactive = {
    ...moduleContext,
    companies: moduleContext.companies.map((item) => ({
      ...item,
      status: "inactive",
    })),
  };
  expect(moduleCompanies(inactive, "tributario")).toEqual([]);
});

it("el expediente y el detalle conservan el módulo original al cambiar de empresa", () => {
  const worker = `/empresas/${moduleCompanyA}/trabajadores/${moduleCompanyB}`;
  const parameters = new URLSearchParams({
    returnTo: worker + "?employmentPeriodId=" + moduleCompanyA,
  });
  const route = workspaceRoute(`/actividades/${moduleCompanyA}`, parameters);
  expect(route).toEqual({
    companyId: moduleCompanyA,
    module: "laboral_trabajador",
    picker: false,
  });
  expect(
    companyChangeDestination(
      `/actividades/${moduleCompanyA}`,
      route,
      moduleCompanyB,
    ),
  ).toBe(`/empresas/${moduleCompanyB}?tab=laboral_trabajador`);
  expect(companyChangeDestination(worker, route, "all")).toBe(
    "/empresas?module=laboral_trabajador",
  );
  expect(activeNavigation(worker, new URLSearchParams())).toBe(
    "laboral_trabajador",
  );
  expect(activeNavigation(`/actividades/${moduleCompanyA}`, parameters)).toBe(
    "laboral_trabajador",
  );
});

it("resuelve enlaces directos, orígenes transversales y destinos externos de forma acotada", () => {
  const route = workspaceRoute(
    `/empresas/${moduleCompanyB}`,
    new URLSearchParams("tab=tributario"),
  );
  expect(selectedCompany(moduleContext, moduleCompanyA, route)).toBe(
    moduleCompanyB,
  );
  expect(
    activeNavigation(
      `/empresas/${moduleCompanyB}`,
      new URLSearchParams("tab=tributario"),
    ),
  ).toBe("tributario");
  expect(
    activeNavigation(
      `/actividades/${moduleCompanyA}`,
      new URLSearchParams({ returnTo: "/documentos?module=tributario" }),
    ),
  ).toBe("documentos");
  expect(
    workspaceRoute(
      `/actividades/${moduleCompanyA}`,
      new URLSearchParams({ returnTo: "https://external.invalid" }),
    ).module,
  ).toBeNull();
  expect(
    selectedCompany(moduleContext, moduleCompanyA, {
      ...route,
      companyId: "99999999-9999-4999-8999-999999999999",
    }),
  ).toBe("all");
});
