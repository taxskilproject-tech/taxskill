export const IDENTITY_TYPES = ["DNI", "CE", "PASSPORT", "OTHER"] as const;
export const TERMINATION_REASONS = [
  "renuncia",
  "despido",
  "fin_contrato",
  "mutuo_acuerdo",
  "otro",
] as const;
export const TERMINATION_LABELS = {
  renuncia: "Renuncia",
  despido: "Despido",
  fin_contrato: "Fin de contrato",
  mutuo_acuerdo: "Mutuo acuerdo",
  otro: "Otro motivo",
};
export const EMPLOYMENT_STAGES = ["ingreso", "relacion", "cese"] as const;
export const STAGE_LABELS = {
  ingreso: "Ingreso",
  relacion: "Relación laboral",
  cese: "Cese",
};
export const WORKER_OPERATIONS = [
  "RegisterWorker",
  "UpdateWorker",
  "StartEmployment",
  "EndEmployment",
  "CorrectEmployment",
  "ReconcileEmployment",
  "DeleteWorker",
  "RestoreWorker",
  "EmitEmploymentRequest",
] as const;
export const MONEY_PATTERN = /^[0-9]{1,12}(\.[0-9]{1,2})?$/;
