export type ModuleId =
  "tributario" | "laboral_trabajador" | "laboral_general" | "actividades";

export type DocumentaryModuleId = Exclude<ModuleId, "actividades">;

export interface ModuleDefinition {
  id: ModuleId;
  name: string;
  description: string;
}
