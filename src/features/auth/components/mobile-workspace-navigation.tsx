"use client";

import { useState } from "react";

import { Icon } from "@/components/atoms/icon";
import { SidePanel } from "@/components/organisms/side-panel";
import { NavigationLinks } from "@/features/auth/components/navigation-links";
import type { MobileNavigationProps } from "@/features/auth/types/navigation.types";
import { documentaryModule } from "@/features/auth/utils/module-navigation";

export function MobileWorkspaceNavigation({
  items,
  active,
  companyName,
}: MobileNavigationProps) {
  const [panel, setPanel] = useState<"modules" | "more" | null>(null);
  const primary = items.filter(
    (item) => item.id === "inicio" || item.id === "actividades",
  );
  const modules = items.filter((item) => item.group === "Módulos");
  const more = items.filter(
    (item) =>
      item.group !== "Módulos" &&
      item.id !== "inicio" &&
      item.id !== "actividades",
  );
  const moduleActive =
    documentaryModule(active) !== null || active === "buzon-sunat";
  return (
    <>
      <nav
        aria-label="Navegación móvil"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-zinc-200 bg-white px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <NavigationLinks items={primary} active={active} centered />
        <button
          aria-expanded={panel === "modules"}
          aria-current={moduleActive ? "page" : undefined}
          className={`flex min-h-11 flex-col items-center justify-center rounded-lg py-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-blue-600 ${moduleActive ? "bg-blue-700 text-white" : "text-slate-700"}`}
          onClick={() => setPanel("modules")}
        >
          <Icon name="modules" />
          Módulos
        </button>
        <button
          aria-expanded={panel === "more"}
          className={`flex min-h-11 flex-col items-center justify-center rounded-lg py-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-blue-600 ${more.some((item) => item.id === active) ? "bg-blue-700 text-white" : "text-slate-700"}`}
          onClick={() => setPanel("more")}
        >
          <Icon name="more" />
          Más
        </button>
      </nav>
      {panel && (
        <SidePanel
          title={panel === "modules" ? "Módulos" : "Más opciones"}
          onClose={() => setPanel(null)}
        >
          {panel === "modules" && (
            <p className="mb-3 text-sm text-zinc-600">{companyName}</p>
          )}
          <nav
            aria-label={
              panel === "modules" ? "Módulos disponibles" : "Más secciones"
            }
            className="space-y-2"
          >
            <NavigationLinks
              active={active}
              items={panel === "modules" ? modules : more}
              onNavigate={() => setPanel(null)}
            />
          </nav>
          {panel === "modules" && !modules.length && (
            <p className="text-sm text-zinc-600">
              No tienes módulos disponibles en este contexto. Consulta al
              administrador o cambia de empresa.
            </p>
          )}
        </SidePanel>
      )}
    </>
  );
}
