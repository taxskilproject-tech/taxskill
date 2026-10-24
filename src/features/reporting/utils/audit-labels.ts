const ACTION_LABELS: Readonly<Record<string, string>> = {
  Bootstrap: "Inicialización del estudio",
  CreateOrUpdateCompany: "Actualización de empresa",
  CreateUser: "Creación de usuario",
  SetUserPassword: "Cambio de contraseña",
  SetUserEnabled: "Cambio de acceso",
  SaveRole: "Actualización de rol",
  AssignAccess: "Asignación de permisos",
  DeleteEntity: "Eliminación lógica",
  RestoreEntity: "Restauración",
  SaveMembership: "Actualización de membresía",
  ApproveVersion: "Aprobación de archivo",
  ObserveVersion: "Observación de archivo",
  ReopenApproved: "Reapertura de archivo",
  ConfigureRequirement: "Configuración documental",
  GenerateRule: "Generación de obligaciones",
  MarkNotificationRead: "Notificación leída",
};
export function auditActionLabel(action: string): string {
  return (
    ACTION_LABELS[action] ??
    action.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ")
  );
}
