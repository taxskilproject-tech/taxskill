// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { DocumentPeriodWorkspace } from "@/features/document-workspace/components/document-period-workspace";

import { fixtureId } from "./fixtures/access";
import { documentPeriodWorkspaceFixture } from "./fixtures/document-workspace";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  replace: vi.fn(),
  parameters: new URLSearchParams(),
}));
vi.mock("@/features/documents/hooks/use-document-query", () => ({
  useDocumentQuery: mocks.query,
}));
vi.mock("@/features/auth/providers/workspace-context", () => ({
  useWorkspace: () => ({ context: { member: { is_admin: true } } }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/empresas/11111111-1111-4111-8111-111111111111",
  useSearchParams: () => mocks.parameters,
  useRouter: () => ({ replace: mocks.replace }),
}));
beforeEach(() => {
  mocks.parameters = new URLSearchParams("tab=tributario&documentYear=2026");
  mocks.replace.mockClear();
  mocks.query.mockReturnValue({
    data: documentPeriodWorkspaceFixture,
    isPending: false,
    isFetching: false,
    error: null,
  });
});
afterEach(cleanup);

it.each(["ingreso", "cese"])(
  "el expediente %s no exige seleccionar un mes",
  (stage) => {
    render(
      <DocumentPeriodWorkspace
        companyId={fixtureId}
        module="laboral_trabajador"
        workerId={fixtureId}
        employmentPeriodId={fixtureId}
        employmentStage={stage}
      />,
    );
    expect(mocks.query.mock.calls.at(-1)?.[1]).toMatchObject({
      document_scope: "checklist",
      employment_stage: stage,
      employment_period_id: fixtureId,
    });
    expect(screen.queryByLabelText("Mes")).toBeNull();
  },
);

it("los eventuales de relación conservan trabajador y periodo laboral sin filtrar por mes", () => {
  mocks.parameters.set("documentScope", "event");
  render(
    <DocumentPeriodWorkspace
      companyId={fixtureId}
      module="laboral_trabajador"
      workerId={fixtureId}
      employmentPeriodId={fixtureId}
      employmentStage="relacion"
    />,
  );
  expect(mocks.query.mock.calls.at(-1)?.[1]).toMatchObject({
    document_scope: "event",
    worker_id: fixtureId,
    employment_period_id: fixtureId,
    month: undefined,
  });
  expect(screen.queryByLabelText("Mes")).toBeNull();
});

it("muestra meses antes que obligaciones y la consulta no pide todos los periodos", () => {
  render(<DocumentPeriodWorkspace companyId={fixtureId} module="tributario" />);
  expect(
    screen.getByRole("heading", { name: "Selecciona el periodo de trabajo" }),
  ).toBeTruthy();
  expect(screen.queryByText("PDT 1")).toBeNull();
  expect(mocks.query.mock.calls.at(-1)?.[1].month).toBeUndefined();
  fireEvent.click(screen.getByRole("button", { name: /octubre/i }));
  expect(mocks.replace).toHaveBeenCalledWith(
    `/empresas/${fixtureId}?tab=tributario&documentYear=2026&documentMonth=10`,
    { scroll: false },
  );
});
it("muestra los dos archivos de PDT y enlaza a cada entregable con retorno completo", () => {
  mocks.parameters.set("documentMonth", "10");
  mocks.parameters.set("documentType", "tributario_pdt");
  render(<DocumentPeriodWorkspace companyId={fixtureId} module="tributario" />);
  const files = screen.getAllByRole("listitem");
  expect(within(files[0]).getByText("PDT 1")).toBeTruthy();
  expect(within(files[1]).getByText("PDT 2")).toBeTruthy();
  const target = screen
    .getByRole("link", { name: "Abrir PDT 2 de PDT mensual" })
    .getAttribute("href");
  const address = new URL(target!, "http://127.0.0.1:4001");
  expect(address.searchParams.get("deliverableId")).toBe(
    documentPeriodWorkspaceFixture.rows[0].files[1].id,
  );
  expect(address.searchParams.get("returnTo")).toContain("documentMonth=10");
});
it("cambiar a otro entregable configurado sin obligaciones reinicia estado y página", () => {
  mocks.query.mockReturnValue({ data: { ...documentPeriodWorkspaceFixture, groups: [{ code: "tributario_calculo", name: "Cálculo tributario Excel", count: 0, total_files: 0, approved_files: 0 }, ...documentPeriodWorkspaceFixture.groups] }, isPending: false, isFetching: false, error: null });
  mocks.parameters = new URLSearchParams(
    "tab=tributario&documentYear=2026&documentMonth=10&documentType=tributario_pdt&documentState=observado&documentPage=3",
  );
  render(<DocumentPeriodWorkspace companyId={fixtureId} module="tributario" />);
  fireEvent.click(
    screen.getByRole("button", { name: /Cálculo tributario Excel/ }),
  );
  expect(mocks.replace).toHaveBeenCalledWith(
    `/empresas/${fixtureId}?tab=tributario&documentYear=2026&documentMonth=10&documentType=tributario_calculo`,
    { scroll: false },
  );
});
it("una URL inválida no inicia una consulta autorizada con filtros ampliados", () => {
  mocks.parameters.set("documentMonth", "13");
  render(<DocumentPeriodWorkspace companyId={fixtureId} module="tributario" />);
  expect(
    screen.getByRole("heading", { name: "Periodo o filtro inválido" }),
  ).toBeTruthy();
  expect(mocks.query.mock.calls.at(-1)?.[3]).toBe(false);
});
