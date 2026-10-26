const ALLOWED_ROUTES =
  /^\/(dashboard|empresas(?:\/[0-9a-f-]{36}(?:\/trabajadores\/[0-9a-f-]{36})?)?|usuarios|configuracion|actividades(?:\/[0-9a-f-]{36})?|reportes|notificaciones|documentos|auditoria)$/;
const ALLOWED_QUERY = new Set([
  "newDeliverable",
  "documentYear",
  "documentMonth",
  "documentType",
  "documentState",
  "documentPage",
  "documentScope",
  "documentStage",
  "returnTo",
  "laborView",
  "catalogQuery",
  "catalogModule",
  "catalogActive",
  "catalogCompany",
  "catalogDeleted",
  "catalogPage",
  "rulesQuery",
  "rulesModule",
  "rulesActive",
  "rulesCompany",
  "rulesDeleted",
  "rulesPage",

  "view",
  "indicators",
  "memberId",
  "deliverableId",
  "workerPage",
  "workerQuery",
  "workerStatus",
  "workerDeleted",
  "obligationPage",
  "obligationPeriod",
  "obligationState",
  "deleted",
  "tab",
  "companyId",
  "module",
  "q",
  "page",
  "pageSize",
  "group",
  "sort",
  "class",
  "priority",
  "responsibleId",
  "scope",
  "period",
  "dueFrom",
  "dueTo",
  "state",
  "unread",
  "employmentPeriodId",
  "stage",
  "company_id",
  "include_deleted",
  "report",
  "indicator",
  "year",
  "month",
  "worker_id",
  "document_type_id",
  "due_from",
  "due_to",
  "actor_id",
  "resource",
  "action",
  "from",
  "to",
]);

const MAX_RETURN_DEPTH = 2;

function internalReturnTo(value: string | null, depth: number): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  )
    return "/dashboard";
  const url = new URL(value, "https://taxskills.invalid");
  if (
    url.origin !== "https://taxskills.invalid" ||
    !ALLOWED_ROUTES.test(url.pathname)
  )
    return "/dashboard";
  for (const key of [...url.searchParams.keys()]) {
    if (!ALLOWED_QUERY.has(key)) url.searchParams.delete(key);
  }
  if (url.searchParams.has("returnTo")) {
    if (depth >= MAX_RETURN_DEPTH) url.searchParams.delete("returnTo");
    else
      url.searchParams.set(
        "returnTo",
        internalReturnTo(url.searchParams.get("returnTo"), depth + 1),
      );
  }
  return url.pathname + url.search;
}

export function safeReturnTo(value: string | null): string {
  return internalReturnTo(value, 0);
}
