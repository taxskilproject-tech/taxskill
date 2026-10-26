export const HEALTH_MESSAGES: Readonly<Record<string, string>> = {
  AUTOMATION_FAILED:
    "Hay un fallo de automatización. Revisa el proceso y su último avance antes de reintentarlo.",
  BACKUP_OVERDUE:
    "No hay un respaldo confirmado dentro del plazo operativo. Revisa el ejecutor de copias.",
  DEADLINES_NO_PROGRESS:
    "El barrido de avisos no avanza. Revisa su cursor y los errores de ejecución.",
  DIGESTS_NO_PROGRESS:
    "La preparación de resúmenes no avanza. Revisa su cursor y los destinatarios con incidencias.",
  GENERATION_FAILED:
    "Hay entregables con generación fallida. Revisa su configuración y el error registrado.",
  GENERATION_NO_PROGRESS:
    "La generación documental no avanza. Revisa los entregables y los eventos laborales pendientes.",
  INVALID_RESPONSIBLES:
    "Hay responsables sin acceso vigente. Revisa las asignaciones y reasigna las entregas.",
  JOB_DISABLED:
    "está detenido. Confirma la ventana operativa antes de habilitarlo.",
  JOB_FAILED: "falló en su última ejecución. Revisa el error del proceso.",
  JOB_INVALID_TIME:
    "tiene una fecha de ejecución inválida. Revisa el reloj y el registro del proceso.",
  JOB_MISSING:
    "no está configurado. Revisa la programación requerida para producción.",
  JOB_NEVER_RAN:
    "no registra ejecuciones. Comprueba su programación y credenciales.",
  JOB_STALLED:
    "no registra un inicio reciente. Revisa la programación y el ejecutor.",
  UPLOAD_STALLED:
    "Hay cargas sin finalizar. Revisa las intenciones pendientes y su recuperación.",
  WHATSAPP_FAILED:
    "Hay resúmenes fallidos. Revisa el seguimiento de WhatsApp antes de reintentar.",
  WHATSAPP_UNKNOWN:
    "Hay envíos con resultado desconocido. Concilia con el proveedor antes de repetirlos.",
};
