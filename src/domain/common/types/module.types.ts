export type ModuleId =
  "tributario" | "laboral_trabajador" | "laboral_general" | "actividades";

export interface ModuleDefinition {
  id: ModuleId;
  name: string;
  description: string;
}
