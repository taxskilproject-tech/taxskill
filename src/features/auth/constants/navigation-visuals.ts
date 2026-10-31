import type { IconName } from "@/components/types/visual.types";
import type { NavigationId } from "@/features/auth/types/navigation.types";

export const NAVIGATION_ICONS: Record<NavigationId, IconName> = {
  inicio: "home",
  actividades: "activity",
  tributario: "tax",
  laboral_trabajador: "worker",
  laboral_general: "team",
  empresas: "company",
  documentos: "document",
  reportes: "report",
  auditoria: "audit",
  notificaciones: "bell",
  usuarios: "users",
  configuracion: "settings",
  "buzon-sunat": "inbox",
};

export const MODULE_ICON_STYLES: Partial<Record<NavigationId, string>> = {
  tributario: "text-blue-500",
  laboral_trabajador: "text-violet-500",
  laboral_general: "text-cyan-600",
};

export const DARK_MODULE_ICON_STYLES: Partial<Record<NavigationId, string>> = {
  tributario: "text-blue-300",
  laboral_trabajador: "text-violet-300",
  laboral_general: "text-cyan-300",
};
