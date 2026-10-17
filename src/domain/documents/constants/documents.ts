export const FILE_FORMATS = [
  "pdf",
  "xls",
  "xlsx",
  "doc",
  "docx",
  "jpg",
  "jpeg",
  "png",
] as const;
export const DOCUMENT_OPERATIONS = [
  "CreateAdditionalActivity",
  "ConfigureAdditionalRequirement",
  "MarkNotificationRead",
  "SaveWhatsAppContact",
  "ReconcileDigest",
  "ImportDocumentCatalog",
  "SaveDocumentType",
  "ConfigureRequirement",
  "GenerateMonthly",
  "GenerateRule",
  "SetRuleActive",
  "EmitRequirementEvent",
  "ReassignDelivery",
  "CreateUploadIntent",
  "ApproveVersion",
  "ObserveVersion",
  "ReopenApproved",
  "SetNotApplicable",
  "CancelObligation",
  "RequestDownload",
  "DeleteDocumentEntity",
  "RestoreDocumentEntity",
] as const;
export const REVIEW_LABELS = {
  pendiente: "Pendiente de entrega",
  por_revisar: "Por revisar",
  observado: "Observado",
  aprobado: "Aprobado",
  no_aplica: "No aplica",
  cancelled: "Cancelada",
} as const;
export const TUS_CHUNK_BYTES = 6 * 1024 * 1024;
export const UPLOAD_RETRIES = [0, 1000, 3000, 5000, 10000];
export const VALIDATION_DELAYS = [1000, 2000, 3000, 5000, 8000, 10000];
export const DEFAULT_FILE_BYTES = 20_000_000;
