import type {
  OperationMetric,
  RateLimitBucket,
  RateLimitConfiguration,
} from "@/features/operations/types/operations.types";

export const RATE_LIMITS: Readonly<
  Record<RateLimitBucket, RateLimitConfiguration>
> = {
  admin: { limit: 20, windowSeconds: 60 },
  receipts: { limit: 120, windowSeconds: 60 },
};

export const OPERATION_METRICS: readonly OperationMetric[] = [
  { key: "stalled_uploads", label: "Cargas sin finalizar" },
  { key: "rejected_uploads", label: "Archivos rechazados en 24 horas" },
  { key: "generation_failures", label: "Reglas con generación fallida" },
  { key: "automation_failures", label: "Fallos de automatización" },
  { key: "invalid_responsibles", label: "Responsables que requieren revisión" },
  { key: "whatsapp_unknown", label: "WhatsApp por conciliar" },
  { key: "whatsapp_failed", label: "WhatsApp fallidos" },
];
export const JOB_LABELS: Readonly<Record<string, string>> = {
  "h08-generation": "Generación documental",
  "h04-generation-day": "Inicio de generación diaria",
  "h04-generation-continuation": "Continuación documental",
  "h05-employment-continuation": "Continuación laboral",
  "h06-notifications-dispatch": "Avisos y resumen diario",
  "h03-staging-cleanup": "Limpieza de cargas vencidas",
};
export const JOB_STATUS_LABELS: Readonly<Record<string, string>> = {
  succeeded: "Correcta",
  failed: "Falló",
  running: "En ejecución",
  starting: "Iniciando",
};
