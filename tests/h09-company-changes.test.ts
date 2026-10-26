import { expect, it } from "vitest";

import { emptyChecklist } from "@/domain/company-profile/utils/profile";
import {
  companyPreparationSchema,
  templateItemSchema,
} from "@/domain/documents/contracts/template.schema";
import { companyDocumentChanges } from "@/features/companies/utils/company-document-changes";

const profile = { ...emptyChecklist(), igv_renta: true };
const template = templateItemSchema.parse({
  document_type_id: "11111111-1111-4111-8111-111111111111",
  code: "tax_new",
  name: "Nuevo entregable",
  module: "tributario",
  stage: "any",
  condition: "always",
  included: true,
  position: 1,
  configuration: {
    frequency: "mensual",
    deadline_offset_days: 2,
    priority: "media",
    is_required: true,
    max_file_bytes: 20000000,
    allowed_formats: ["pdf"],
    deliverable_specs: [
      {
        position_code: "file_1",
        label: "Archivo",
        display_order: 1,
        allowed_formats: ["pdf"],
        max_file_bytes: 20000000,
      },
    ],
  },
});
const current = companyPreparationSchema.parse({
  rows: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      code: "own_tax",
      name: "Propio",
      module: "tributario",
      condition: "always",
      active: false,
      pending: false,
      from_template: false,
      starts_on: "2026-10-25",
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      code: "old_tax",
      name: "Plantilla anterior",
      module: "tributario",
      condition: "always",
      active: true,
      pending: false,
      from_template: true,
      starts_on: "2026-10-25",
    },
  ],
}).rows;
it("anticipa añadir, pausar y conservar sin sobrescribir el entregable propio pausado", () => {
  const changes = companyDocumentChanges(current, [template], profile);
  expect(changes.additions.map((item) => item.code)).toEqual(["tax_new"]);
  expect(changes.removed.map((item) => item.code)).toEqual(["old_tax"]);
  expect(changes.kept.map((item) => item.code)).toEqual(["own_tax"]);
  expect(current[0].active).toBe(false);
});
it("no calcula incorporaciones ni bajas si el checklist todavía es inválido", () => {
  const changes = companyDocumentChanges(current, [template], emptyChecklist());
  expect(changes.additions).toEqual([]);
  expect(changes.removed).toEqual([]);
  expect(changes.kept).toHaveLength(2);
});
it("un módulo deshabilitado deja de solicitar incluso sus configuraciones particulares", () => {
  const changes = companyDocumentChanges(current, [template], {
    ...emptyChecklist(),
    plame: true,
    health_coverage: "none",
  });
  expect(changes.additions).toEqual([]);
  expect(changes.removed).toHaveLength(2);
  expect(changes.kept).toEqual([]);
});
