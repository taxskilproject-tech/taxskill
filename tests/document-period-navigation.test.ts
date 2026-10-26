import { expect, it } from "vitest";

import { safeReturnTo } from "@/features/auth/utils/safe-return-to";
import { workspaceDocumentTypes } from "@/features/document-workspace/constants/documents";
import {
  clearDocumentWorkspaceFilters,
  documentPeriodSelection,
  documentPeriodSelectionUrl,
} from "@/features/document-workspace/utils/document-period-navigation";
import {
  documentFileDestination,
  documentPeriodLabel,
  limaDocumentYear,
} from "@/features/document-workspace/utils/document-period-presentation";
import { documentWorkspaceMode } from "@/features/document-workspace/utils/document-workspace-mode";

it("comparte el catálogo ordenado con Laboral general y las boletas de relación", () => {
  expect(
    workspaceDocumentTypes("laboral_general").map((item) => item.code),
  ).toEqual([
    "laboral_asistencia",
    "laboral_planilla",
    "laboral_planilla_afp",
    "laboral_pago_afp",
    "laboral_reporte_sis",
    "laboral_pago_sis",
    "laboral_reporte_essalud",
    "laboral_pago_essalud",
    "laboral_reporte_plame",
    "laboral_constancia_plame",
  ]);
  expect(workspaceDocumentTypes("laboral_trabajador", "relacion")[0].code).toBe(
    "relacion_boleta",
  );
});

it.each(["ingreso", "cese"])(
  "%s usa checklist del periodo laboral, sin filtro mensual",
  (stage) => {
    const selection = documentPeriodSelection(new URLSearchParams(), 2026);
    const mode = documentWorkspaceMode(
      {
        companyId: "company",
        module: "laboral_trabajador",
        workerId: "worker",
        employmentPeriodId: "employment",
        employmentStage: stage,
      },
      selection,
    );
    expect(mode).toMatchObject({ scope: "checklist", stage, calendar: false });
  },
);

it("limpia el contexto de documentos al cambiar de periodo laboral o etapa", () => {
  const original = new URLSearchParams(
    "employmentPeriodId=one&stage=relacion&documentYear=2026&documentMonth=10&documentType=boleta&documentScope=event&documentPage=3",
  );
  expect(clearDocumentWorkspaceFilters(original).toString()).toBe(
    "employmentPeriodId=one&stage=relacion",
  );
  expect(original.get("documentMonth")).toBe("10");
});

it("el año inicial sigue Lima en el límite de año UTC", () => {
  expect(limaDocumentYear(new Date("2027-01-01T01:00:00Z"))).toBe(2026);
});

import { fixtureId } from "./fixtures/access";
import { documentPeriodWorkspaceFixture } from "./fixtures/document-workspace";

it("exige seleccionar mes y conserva el año de trabajo de Lima", () => {
  expect(documentPeriodSelection(new URLSearchParams(), 2026)).toMatchObject({
    year: 2026,
    month: null,
    page: 1,
    invalid: false,
  });
});
it("acepta enlaces mensuales anteriores sin extenderlos a todos los periodos", () => {
  expect(
    documentPeriodSelection(
      new URLSearchParams("obligationPeriod=2025-09"),
      2026,
    ),
  ).toMatchObject({ year: 2025, month: 9 });
});
it.each([
  "documentMonth=13",
  "documentMonth=0",
  "documentYear=no",
  "documentYear=10000",
  "documentPage=-1",
  "documentState=invalid",
])("rechaza filtros malformados: %s", (value) => {
  expect(
    documentPeriodSelection(new URLSearchParams(value), 2026).invalid,
  ).toBe(true);
});
it("cambiar mes elimina documento, estado y página, conservando la ruta del módulo", () => {
  const result = documentPeriodSelectionUrl(
    "/empresas/" + fixtureId,
    new URLSearchParams(
      "tab=tributario&documentYear=2026&documentMonth=10&documentType=tributario_pdt&documentState=observado&documentPage=3",
    ),
    "documentMonth",
    "11",
  );
  expect(result).toBe(
    `/empresas/${fixtureId}?tab=tributario&documentYear=2026&documentMonth=11`,
  );
});
it("cambiar año obliga a elegir un nuevo mes", () => {
  expect(
    documentPeriodSelectionUrl(
      "/empresas/" + fixtureId,
      new URLSearchParams("tab=tributario&documentMonth=10&documentType=pdt"),
      "documentYear",
      "2025",
    ),
  ).toBe(`/empresas/${fixtureId}?tab=tributario&documentYear=2025`);
});
it("devuelve a empresa, periodo, tipo, estado y página desde un archivo concreto", () => {
  const origin = `/empresas/${fixtureId}?tab=tributario&documentYear=2026&documentMonth=10&documentType=tributario_pdt&documentState=pendiente&documentPage=2`;
  const destination = new URL(
    documentFileDestination(fixtureId, fixtureId, origin),
    "http://127.0.0.1:4001",
  );
  expect(destination.searchParams.get("deliverableId")).toBe(fixtureId);
  expect(safeReturnTo(destination.searchParams.get("returnTo"))).toBe(origin);
});
it("presenta quincenas y semanas usando fechas del periodo", () => {
  expect(
    documentPeriodLabel({
      ...documentPeriodWorkspaceFixture.rows[0],
      period_kind: "fortnightly",
      period_start: "2026-10-16",
    }),
  ).toContain("2.ª quincena");
  expect(
    documentPeriodLabel({
      ...documentPeriodWorkspaceFixture.rows[0],
      period_kind: "weekly",
      period_start: "2026-09-28",
      period_end: "2026-10-04",
    }),
  ).toBe("Semana · 28/09/2026 – 04/10/2026");
});
