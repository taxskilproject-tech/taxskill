// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { companyScope } from "./fixtures/scopes";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.query }));
vi.mock("@/lib/query/hooks/use-data-scope", () => ({
  useDataScope: () => companyScope,
}));
vi.mock("@/features/access/hooks/use-command", () => ({
  useCommand: () => ({ busy: false, error: null, result: null }),
}));
vi.mock("@/features/companies/repositories/company-access.repository", () => ({
  loadCompanyAccess: vi.fn(),
}));
vi.mock("@/features/access/components/lifecycle-control", () => ({
  LifecycleControl: () => null,
}));

import { ResponsibleForm } from "@/features/companies/components/responsible-form";

import {
  companyFixture,
  directoryFixture,
  fixtureId,
  grantFixture,
  moduleSettingsFixture,
} from "./fixtures/access";

afterEach(cleanup);
it("mantiene el responsable guardado cuando sus opciones llegan después", () => {
  mocks.query.mockReturnValue({
    data: undefined,
    isPending: true,
    error: null,
  });
  const props = {
    company: companyFixture,
    module: "tributario",
    current: moduleSettingsFixture,
    directory: directoryFixture,
    onSaved: vi.fn(),
  } as const;
  const view = render(<ResponsibleForm {...props} />);
  expect(
    screen
      .getByRole("button", { name: "Guardar responsable" })
      .hasAttribute("disabled"),
  ).toBe(true);
  mocks.query.mockReturnValue({
    data: { grants: [grantFixture], overrides: [] },
    isPending: false,
    error: null,
  });
  view.rerender(<ResponsibleForm {...props} />);
  const select = screen.getByRole("combobox", {
    name: "Responsable de entrega",
  });
  if (!(select instanceof HTMLSelectElement))
    throw new Error("Se esperaba un selector accesible.");
  expect(select.value).toBe(fixtureId);
  expect(select.selectedOptions[0]?.textContent).toBe("Responsable ficticio");
});
