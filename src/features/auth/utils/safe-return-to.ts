const ALLOWED_ROUTES =
  /^\/(dashboard|empresas(?:\/[0-9a-f-]{36}(?:\/trabajadores\/[0-9a-f-]{36})?)?|usuarios|configuracion|actividades(?:\/[0-9a-f-]{36})?|reportes|notificaciones|documentos|auditoria)$/;
const ALLOWED_QUERY = new Set([
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
  "company_id", "include_deleted", "report", "indicator", "year", "month", "worker_id", "document_type_id",
  "due_from", "due_to", "actor_id", "resource", "action", "from", "to",
]);

export function safeReturnTo(value: string | null) {
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
  return url.pathname + url.search;
}
