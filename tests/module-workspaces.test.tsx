// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { MobileWorkspaceNavigation } from "@/features/auth/components/mobile-workspace-navigation";
import { workspaceNavigation } from "@/features/auth/utils/workspace-navigation";
import { ModuleCompanyPicker } from "@/features/companies/pages/module-company-picker";
import { CompanyModuleWorkspace } from "@/features/documents/components/company-module-workspace";

import { companyFixture } from "./fixtures/access";
import { moduleContext } from "./fixtures/module-navigation";
import { companyScope } from "./fixtures/scopes";

const calls = vi.hoisted(() => ({
  tax: vi.fn(),
  obligations: vi.fn(),
  workers: vi.fn(),
  companies: vi.fn(),
}));
const workspace = {
  current: moduleContext,
  parameters: new URLSearchParams("module=tributario"),
};
vi.mock("@/features/auth/providers/workspace-context", () => ({
  useWorkspace: () => ({ context: workspace.current }),
}));
vi.mock("@/features/documents/components/obligation-list", () => ({
  ObligationList: calls.obligations,
}));
vi.mock(
  "@/features/document-workspace/components/document-period-workspace",
  () => ({
    DocumentPeriodWorkspace: calls.tax,
  }),
);
vi.mock("@/features/workers/components/workers-panel", () => ({
  WorkersPanel: calls.workers,
}));
vi.mock("@/features/access/repositories/access.repository", () => ({
  listCompanies: calls.companies,
}));
vi.mock("@/lib/query/hooks/use-data-scope", () => ({
  useDataScope: () => companyScope,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/empresas",
  useSearchParams: () => workspace.parameters,
  useRouter: () => ({ replace: vi.fn() }),
}));
beforeEach(() => {
  workspace.current = moduleContext;
  workspace.parameters = new URLSearchParams("module=tributario");
  calls.obligations.mockReturnValue(null);
  calls.tax.mockReturnValue(null);
  calls.workers.mockReturnValue(null);
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
});
afterEach(cleanup);

it("un módulo sin permiso no monta consultas documentales ni laborales", () => {
  render(
    <CompanyModuleWorkspace
      company={companyFixture}
      module="laboral_trabajador"
    />,
  );
  expect(
    screen.getByRole("heading", { name: "Acceso restringido" }),
  ).toBeTruthy();
  expect(calls.obligations).not.toHaveBeenCalled();
  expect(calls.workers).not.toHaveBeenCalled();
  expect(
    screen.getByRole("link", { name: "Cambiar empresa" }).getAttribute("href"),
  ).toBe("/empresas?module=laboral_trabajador");
});

it.each(["tributario", "laboral_general", "laboral_trabajador"] as const)(
  "abre %s con la misma vista por periodos",
  (module) => {
    workspace.current = {
      ...moduleContext,
      member: { ...moduleContext.member, is_admin: true },
    };
    workspace.parameters = new URLSearchParams(
      `tab=${module}&laborView=obligations`,
    );
    render(<CompanyModuleWorkspace company={companyFixture} module={module} />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(calls.tax.mock.calls[0][0]).toEqual({
      companyId: companyFixture.id,
      module,
    });
    expect(calls.obligations).not.toHaveBeenCalled();
    expect(calls.workers).not.toHaveBeenCalled();
  },
);

it("sin empresas elegibles muestra vacío y no inicia solicitudes ni un loading infinito", () => {
  workspace.current = { ...moduleContext, capabilities: [] };
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ModuleCompanyPicker module="tributario" />
    </QueryClientProvider>,
  );
  expect(
    screen.getByRole("heading", { name: "Sin empresas disponibles" }),
  ).toBeTruthy();
  expect(screen.queryByText("Cargando información…")).toBeNull();
  expect(calls.companies).not.toHaveBeenCalled();
});

it("la barra móvil abre módulos y mueve Empresas a Más, con foco recuperable", () => {
  render(
    <MobileWorkspaceNavigation
      items={workspaceNavigation(moduleContext)}
      active="tributario"
      companyName="Empresa A"
    />,
  );
  const bar = screen.getByRole("navigation", { name: "Navegación móvil" });
  expect(within(bar).queryByRole("link", { name: "Empresas" })).toBeNull();
  fireEvent.click(within(bar).getByRole("button", { name: "Módulos" }));
  expect(screen.getByRole("dialog", { name: "Módulos" })).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Tributario" }).getAttribute("href"),
  ).toBe("/empresas?module=tributario");
  fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
  fireEvent.click(within(bar).getByRole("button", { name: "Más" }));
  expect(screen.getByRole("link", { name: "Empresas" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Documentos" })).toBeTruthy();
});
