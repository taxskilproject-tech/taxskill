const DIGEST_ERRORS: Readonly<Record<string, string>> = {
  CONNECTION_ERROR: "No se pudo conectar con el servicio de mensajería",
  HTTP_RETRYABLE:
    "El servicio no respondió correctamente; hay reintentos registrados",
  HTTP_UNAUTHORIZED: "El servicio rechazó la autenticación",
  HTTP_TIMEOUT: "Se agotó el tiempo de espera",
  PROVIDER_RECONCILIATION_REQUIRED:
    "Falta confirmar el resultado con el proveedor",
};

export function digestErrorLabel(code: string): string {
  return DIGEST_ERRORS[code] ?? "El envío requiere revisión";
}
