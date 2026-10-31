export const LOGIN_TRACE_LIMIT = 16;
export const LOGIN_PAGE_KINDS = [
  "sol_login",
  "sol_menu",
  "sunat_other",
  "unexpected_origin",
] as const;
export const LOGIN_RESOURCE_KINDS = [
  "document",
  "script",
  "stylesheet",
  "image",
  "font",
  "xhr",
  "fetch",
  "other",
] as const;
export const LOGIN_FAILURE_CODES = [
  "ERR_ABORTED",
  "ERR_FAILED",
  "ERR_NAME_NOT_RESOLVED",
  "ERR_CONNECTION_RESET",
  "ERR_CONNECTION_CLOSED",
  "ERR_CONNECTION_REFUSED",
  "ERR_EMPTY_RESPONSE",
  "ERR_TIMED_OUT",
  "ERR_CERT_AUTHORITY_INVALID",
  "ERR_CERT_DATE_INVALID",
  "ERR_SSL_PROTOCOL_ERROR",
  "ERR_HTTP2_PROTOCOL_ERROR",
  "ERR_BLOCKED_BY_CLIENT",
  "ERR_BLOCKED_BY_RESPONSE",
  "OTHER",
] as const;
export const LOGIN_SCRIPT_ERROR_KINDS = [
  "SyntaxError",
  "ReferenceError",
  "TypeError",
  "RangeError",
  "Other",
] as const;
