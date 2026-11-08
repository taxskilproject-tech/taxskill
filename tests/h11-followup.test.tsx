// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { reportFiltersSchema } from "@/domain/reporting/contracts/reporting.schema";
import { legacyReportingInput } from "@/domain/reporting/utils/followup-filters";
import {
  parseReportFilters,
  serializeReportFilters,
} from "@/domain/reporting/utils/report-filters";
import { safeReturnTo } from "@/features/auth/utils/safe-return-to";
import { CompanyIndicatorRow } from "@/features/reporting/components/company-indicator-row";
import { DeliveryRows } from "@/features/reporting/components/delivery-rows";
import { DocumentFollowupControls } from "@/features/reporting/components/document-followup-controls";

const fixture = vi.hoisted(() => ({ client: false }));
vi.mock("@/features/auth/providers/workspace-context", () => ({
  useWorkspace: () => ({
    context: {
      member: { member_type: fixture.client ? "client" : "internal" },
      profile: { full_name: "Alex Asistente" },
    },
  }),
}));
vi.mock("@/features/reporting/hooks/use-report-query", () => ({
  useReportQuery: () => ({
    data: {
      rows: [
        {
          user_id: "11111111-1111-4111-8111-111111111111",
          name: "Alex",
          email: "alex@example.test",
          active: true,
        },
        {
          user_id: "22222222-2222-4222-8222-222222222222",
          name: "Beatriz",
          email: "beatriz@example.test",
          active: true,
        },
      ],
    },
    isPending: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));
afterEach(() => {
  cleanup();
  fixture.client = false;
});

it("conserva vista, asistente y periodo en el retorno y en la URL", () => {
  const filters = reportFiltersSchema.parse({
    document_view: "pending",
    document_month: "2026-10",
    assistant_id: "11111111-1111-4111-8111-111111111111",
    page: 2,
  });
  const destination = "/documentos?" + serializeReportFilters(filters);
  expect(safeReturnTo(destination)).toBe(destination);
  expect(
    parseReportFilters(new URL(destination, "http://localhost").searchParams),
  ).toEqual(filters);
  expect(legacyReportingInput(filters)).not.toHaveProperty("document_month");
  expect(legacyReportingInput(filters)).toHaveProperty("page", 2);
});
it("la pestaña Resumen no se interpreta como filtro documental y un mes inválido sigue rechazado", () => {
  expect(
    parseReportFilters(
      new URLSearchParams("tab=resumen&document_month=2026-10"),
      true,
    ),
  ).toHaveProperty("document_month", "2026-10");
  expect(() =>
    parseReportFilters(
      new URLSearchParams("tab=resumen&document_month=2026-99"),
      true,
    ),
  ).toThrow();
});
it("cambiar vista conserva el selector de asistente y emite solo la navegación solicitada", () => {
  const onView = vi.fn();
  const filters = reportFiltersSchema.parse({
    assistant_id: "11111111-1111-4111-8111-111111111111",
  });
  render(
    <DocumentFollowupControls
      filters={filters}
      onChange={vi.fn()}
      onView={onView}
      onInvalidAssistant={vi.fn()}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Pendientes de entrega" }),
  );
  expect(onView).toHaveBeenCalledExactlyOnceWith("pending");
  expect(screen.getByLabelText("Asistente contable")).toHaveProperty(
    "value",
    filters.assistant_id,
  );
});
it("el Cliente reconoce su identidad sin un selector de otros asistentes", () => {
  fixture.client = true;
  render(
    <DocumentFollowupControls
      filters={reportFiltersSchema.parse({})}
      onChange={vi.fn()}
      onView={vi.fn()}
      onInvalidAssistant={vi.fn()}
    />,
  );
  expect(screen.getByText(/Asistente contable · Alex Asistente/)).toBeTruthy();
  expect(screen.queryByRole("combobox")).toBeNull();
});
it("el indicador abre su detalle usando archivos únicos y admite denominador vacío", () => {
  const onSelect = vi.fn();
  render(
    <CompanyIndicatorRow
      row={{
        company_id: "company",
        company_name: "Empresa",
        required: 0,
        approved: 0,
        pending: 3,
        on_time: 1,
        late: 1,
      }}
      onSelect={onSelect}
    />,
  );
  fireEvent.click(
    screen.getAllByRole("button", { name: "Fuera de plazo de Empresa" })[0],
  );
  expect(onSelect).toHaveBeenCalledExactlyOnceWith("late");
  expect(screen.getAllByText("Sin obligaciones").length).toBeGreaterThan(0);
});
it("un archivo pendiente de corrección enlaza la obligación conservando los filtros", () => {
  render(
    <DeliveryRows
      origin="/documentos?document_view=pending&document_month=2026-10"
      rows={[
        {
          id: "file",
          obligation_id: "obligation",
          company_name: "Empresa",
          module: "tributario",
          title: "PDT",
          label: "Constancia",
          period: "2026-10",
          worker_name: null,
          state: "observado",
          reason: "correction",
          due_date: "2026-11-07",
          received_at: null,
        },
      ]}
    />,
  );
  expect(screen.getByText("Corrección")).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Constancia" }).getAttribute("href"),
  ).toContain("returnTo=");
  expect(
    screen.getByRole("link", { name: "Constancia" }).getAttribute("href"),
  ).toContain("deliverableId=file");
});
