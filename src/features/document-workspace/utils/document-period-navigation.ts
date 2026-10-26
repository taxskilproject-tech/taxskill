import { DOCUMENT_STATES } from "@/features/document-workspace/constants/documents";
import type {
  DocumentPeriodNavigationKey,
  DocumentPeriodSelection,
} from "@/features/document-workspace/types/document-workspace-ui.types";

export function documentPeriodSelection(
  parameters: URLSearchParams,
  currentYear: number,
): DocumentPeriodSelection {
  const legacy = parameters.get("obligationPeriod") ?? "";
  const legacyMonth = /^\d{4}-\d{2}$/.test(legacy) ? legacy : "";
  const yearValue = parameters.get("documentYear") ?? legacyMonth.slice(0, 4);
  const monthValue = parameters.get("documentMonth") ?? legacyMonth.slice(5);
  const year = yearValue ? Number(yearValue) : currentYear;
  const month = monthValue ? Number(monthValue) : null;
  const pageValue = parameters.get("documentPage") ?? "1";
  const page = Number(pageValue);
  const code = parameters.get("documentType") ?? "";
  const state = parameters.get("documentState") ?? "";
  const scope = parameters.get("documentScope") ?? "periodic";
  const stage = parameters.get("documentStage") ?? "relacion";
  const invalid =
    !Number.isInteger(year) ||
    year < 1 ||
    year > 9998 ||
    (month !== null && (!Number.isInteger(month) || month < 1 || month > 12)) ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > 1000000 ||
    code.length > 60 ||
    !DOCUMENT_STATES.some((item) => item.value === state) ||
    !["periodic", "event"].includes(scope) ||
    !["ingreso", "relacion", "cese"].includes(stage);
  return { year, month, code, state, page, invalid, scope, stage };
}

export function documentPeriodSelectionUrl(
  pathname: string,
  parameters: URLSearchParams,
  key: DocumentPeriodNavigationKey,
  value: string,
) {
  const next = new URLSearchParams(parameters);
  for (const name of ["obligationPeriod", "obligationState", "obligationPage"])
    next.delete(name);
  const dependent: Record<DocumentPeriodNavigationKey, string[]> = {
    documentYear: [
      "documentMonth",
      "documentType",
      "documentState",
      "documentPage",
      "documentScope",
      "documentStage",
    ],
    documentMonth: ["documentType", "documentState", "documentPage"],
    documentType: ["documentState", "documentPage"],
    documentState: ["documentPage"],
    documentStage: [
      "documentType",
      "documentState",
      "documentPage",
      "documentScope",
    ],
    documentPage: [],
    documentScope: [
      "documentMonth",
      "documentType",
      "documentState",
      "documentPage",
    ],
  };
  for (const name of dependent[key]) next.delete(name);
  if (value) next.set(key, value);
  else next.delete(key);
  return `${pathname}?${next}`;
}

export function clearDocumentWorkspaceFilters(parameters: URLSearchParams) {
  const next = new URLSearchParams(parameters);
  for (const key of [
    "documentYear",
    "documentMonth",
    "documentType",
    "documentState",
    "documentPage",
    "documentScope",
    "documentStage",
    "obligationPeriod",
    "obligationPage",
    "obligationState",
    "deliverableId",
  ])
    next.delete(key);
  return next;
}
