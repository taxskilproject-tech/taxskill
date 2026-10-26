import type { DocumentaryProfile } from "@/domain/company-profile/types/profile.types";
import {
  appliesToProfile,
  documentCondition,
} from "@/domain/company-profile/utils/profile";
import type { CatalogRow } from "@/domain/documents/types/document.types";
import type { TemplateItem } from "@/domain/documents/types/template.types";

export function applicableTemplateItems(
  items: TemplateItem[],
  profile: DocumentaryProfile,
) {
  return items
    .filter(
      (item) =>
        item.included && appliesToProfile(profile, item.module, item.condition),
    )
    .toSorted(
      (a, b) => a.position - b.position || a.code.localeCompare(b.code),
    );
}
export function deadlineDescription(value: number | null) {
  if (value === null) return "Plazo por configurar";
  if (value === 0) return "Al cierre del periodo o fecha del evento";
  return `${Math.abs(value)} días ${value > 0 ? "después" : "antes"} del cierre o evento`;
}
export function templatePreviewGroups(
  items: TemplateItem[],
  profile: DocumentaryProfile,
) {
  const applicable = applicableTemplateItems(items, profile);
  const groups = [
    {
      id: "tributario",
      label: "Tributario",
      module: "tributario",
      stage: "any",
    },
    {
      id: "laboral_general",
      label: "Laboral general",
      module: "laboral_general",
      stage: "any",
    },
    {
      id: "ingreso",
      label: "Laboral por trabajador · Ingreso",
      module: "laboral_trabajador",
      stage: "ingreso",
    },
    {
      id: "relacion",
      label: "Laboral por trabajador · Relación laboral",
      module: "laboral_trabajador",
      stage: "relacion",
    },
    {
      id: "cese",
      label: "Laboral por trabajador · Cese",
      module: "laboral_trabajador",
      stage: "cese",
    },
    {
      id: "laboral_any",
      label: "Laboral por trabajador · Todas las etapas",
      module: "laboral_trabajador",
      stage: "any",
    },
  ];
  return groups
    .map((group) => ({
      ...group,
      items: applicable.filter(
        (item) => item.module === group.module && item.stage === group.stage,
      ),
    }))
    .filter((group) => group.items.length > 0);
}
export function catalogTemplateItem(
  item: CatalogRow,
  position: number,
): TemplateItem {
  const stage = ["ingreso", "relacion", "cese"].find(
    (value) => value === item.category,
  );
  return {
    document_type_id: item.id,
    code: item.code,
    name: item.name,
    module: item.module,
    stage:
      stage === "ingreso"
        ? "ingreso"
        : stage === "cese"
          ? "cese"
          : stage === "relacion"
            ? "relacion"
            : "any",
    condition: documentCondition(item.code, item.module),
    included: true,
    position,
    configuration: {
      frequency: null,
      deadline_offset_days: null,
      interval_count: null,
      interval_unit: null,
      anchor_date: null,
      priority: "media",
      is_required: true,
      max_file_bytes: 20000000,
      allowed_formats: item.suggested_formats,
      deliverable_specs: [
        {
          position_code: "file_1",
          label: item.name,
          display_order: 1,
          allowed_formats: item.suggested_formats,
          max_file_bytes: 20000000,
        },
      ],
    },
  };
}
