import type { DocumentaryModuleId } from "@/domain/common/types/module.types";
import { DOCUMENT_CATALOG_TEMPLATES } from "@/domain/documents/constants/catalog-templates";

export function workspaceDocumentTypes(
  module: DocumentaryModuleId,
  stage?: string,
) {
  return DOCUMENT_CATALOG_TEMPLATES.filter(
    (type) => type.module === module && (!stage || type.category === stage),
  );
}
export const DOCUMENT_MONTHS = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: new Intl.DateTimeFormat("es-PE", {
    month: "long",
    timeZone: "UTC",
  }).format(
    new Date(`2026-${String(index + 1).padStart(2, "0")}-15T12:00:00Z`),
  ),
}));
export const DOCUMENT_STATES = [
  { value: "", label: "Todos los estados" },
  { value: "pendiente", label: "Pendiente de entrega" },
  { value: "por_revisar", label: "Por revisar" },
  { value: "observado", label: "Observado" },
  { value: "aprobado", label: "Aprobado" },
  { value: "no_aplica", label: "No aplica" },
  { value: "cancelled", label: "Cancelado" },
];
