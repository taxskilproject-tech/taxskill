export const SUNAT_READ_WARNING =
  "Consultar el buzón desde TaxSkill puede marcar mensajes como leídos en SUNAT.";
export const SUNAT_BUCKET = "sunat-mailbox";
export const SUNAT_FILE_LIMIT = 20000000;
export const SUNAT_POLL_INTERVAL_MS = 2500;
export const SUNAT_IDLE_POLL_INTERVAL_MS = 30000;
export const SUNAT_MANUAL_WAIT_MS = 150000;
export const SUNAT_DISPATCH_RETRY_MS = 10000;
export const SUNAT_ACTION_POLL_INTERVAL_MS = 1200;
export const SUNAT_STATUS_LABELS: Readonly<Record<string, string>> = {
  pending_verification: "Verificando conexión",
  connected: "Conectado",
  needs_attention: "Requiere atención",
  disconnected: "Desconectado",
  queued: "En espera",
  running: "Consultando SUNAT",
  complete: "Consulta completa",
  partial: "Consulta incompleta",
  failed: "No se pudo completar",
  cancelled: "Cancelada",
};
export const SUNAT_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  SANDBOX_QUOTA_EXCEEDED:
    "El proveedor de ejecución aplicó un límite de uso. El administrador debe revisar la cuota disponible antes de reintentar.",
  SANDBOX_EXECUTION_FAILED:
    "No se pudo ejecutar la consulta. El administrador debe revisar el servicio del buzón.",
  SANDBOX_CLEANUP_FAILED:
    "El servicio no confirmó su cierre. Se bloquearán nuevas ejecuciones hasta liberar el proceso de forma segura.",
  PAGE_INCONSISTENT:
    "SUNAT devolvió una página incompleta. Conservamos los registros recuperados; vuelve a consultar.",
  SOURCE_CHANGED:
    "La bandeja cambió durante la consulta. Inicia una consulta nueva para reconciliar los registros.",
  SOURCE_UNAVAILABLE:
    "SUNAT no respondió correctamente. Se conserva la última información disponible.",
  SESSION_EXPIRED:
    "La sesión en SUNAT venció y no pudo renovarse. Solicita al administrador verificar la conexión.",
  CREDENTIAL_REJECTED:
    "SUNAT rechazó el acceso. El administrador debe actualizar el usuario o la clave SOL.",
  VERIFICATION_REQUIRED:
    "SUNAT solicita una verificación humana. El administrador debe revisar el acceso en el portal oficial.",
  WORKER_TIMEOUT:
    "El servicio no terminó a tiempo. Revisa su disponibilidad y vuelve a intentar.",
  ACCESS_REVOKED:
    "El acceso cambió durante la consulta. El administrador debe revisar los permisos.",
  BUDGET_EXHAUSTED:
    "Se alcanzó el límite de esta consulta. Los registros recuperados permanecen disponibles.",
  FILE_TOO_LARGE: "El adjunto supera el límite inicial de 20 MB.",
  FILE_INVALID: "El archivo recibido no se puede almacenar de forma segura.",
  UNEXPECTED_RESPONSE:
    "La respuesta de SUNAT no tiene el formato esperado. Se necesita revisar el conector.",
};
export const SUNAT_MAILBOX_LABELS = {
  notifications: "Notificaciones",
  messages: "Mensajes",
};
