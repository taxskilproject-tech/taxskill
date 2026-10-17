export const DOCUMENT_MODULES = [
  "tributario",
  "laboral_general",
  "laboral_trabajador",
] as const;
export const FREQUENCIES = [
  "unica",
  "diaria",
  "semanal",
  "quincenal",
  "mensual",
  "trimestral",
  "semestral",
  "anual",
  "eventual",
  "personalizada",
] as const;
export const FREQUENCY_LABELS = {
  unica: "Única",
  diaria: "Diaria",
  semanal: "Semanal",
  quincenal: "Quincenal",
  mensual: "Mensual",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
  eventual: "Eventual",
  personalizada: "Personalizada",
} as const;
export const MODULE_LABELS = {
  tributario: "Tributario",
  laboral_general: "Laboral general",
  laboral_trabajador: "Laboral por trabajador",
} as const;
export const MAX_DELIVERABLES = 20;
export const MAX_CONFIGURED_FILE_BYTES = 50_000_000;
export const GENERATION_BATCH_SIZE = 50;
