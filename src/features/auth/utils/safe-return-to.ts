const ALLOWED_ROUTES =
  /^\/(dashboard|empresas(?:\/[0-9a-f-]{36})?|usuarios|configuracion|actividades(?:\/[0-9a-f-]{36})?|reportes|notificaciones|documentos|auditoria)$/;
const ALLOWED_QUERY = new Set([
  "tab",
  "companyId",
  "module",
  "q",
  "page",
  "pageSize",
  "group",
  "sort",
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
