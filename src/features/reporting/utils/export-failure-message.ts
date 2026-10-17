export function exportFailureMessage(failure: unknown, cancelled: boolean) {
  if (failure instanceof Error && failure.name !== "AbortError")
    return failure.message;
  if (cancelled) return "Exportación cancelada. No se descargó ningún archivo.";
  return "No se pudo exportar. Vuelve a intentarlo.";
}
