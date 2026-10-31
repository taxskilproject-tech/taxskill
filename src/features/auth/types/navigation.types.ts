import type { DocumentaryModuleId } from "@/domain/common/types/module.types";

export type NavigationId =
  | "inicio"
  | "actividades"
  | "empresas"
  | "documentos"
  | "reportes"
  | "auditoria"
  | "notificaciones"
  | "usuarios"
  | "configuracion"
  | "buzon-sunat"
  | DocumentaryModuleId;

export interface NavigationItem {
  id: NavigationId;
  href: string;
  label: string;
  group: string;
}

export interface NavigationLinksProps {
  items: readonly NavigationItem[];
  active: NavigationId;
  onNavigate?: () => void;
  centered?: boolean;
  dark?: boolean;
}

export interface MobileNavigationProps extends NavigationLinksProps {
  companyName: string;
}
