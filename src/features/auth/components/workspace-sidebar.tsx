import Link from "next/link";

import { Icon } from "@/components/atoms/icon";
import { NavigationLinks } from "@/features/auth/components/navigation-links";
import type { MobileNavigationProps } from "@/features/auth/types/navigation.types";

export function WorkspaceSidebar({
  items,
  active,
  companyName,
}: MobileNavigationProps) {
  const primary = items.filter(
    (item) => item.id === "inicio" || item.id === "actividades",
  );
  const modules = items.filter((item) => item.group === "Módulos");
  const consultation = items.filter(
    (item) => item.group === "Consulta" || item.group === "Supervisión",
  );
  const administration = items.filter(
    (item) => item.group === "Administración",
  );
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col overflow-y-auto bg-slate-950 p-3 text-slate-100 lg:flex">
      <Link
        className="flex min-h-12 items-center gap-2 px-3 text-xl font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-blue-400"
        href="/dashboard"
      >
        <span className="rounded-lg bg-blue-600 p-1.5">
          <Icon name="document" />
        </span>{" "}
        TaxSkills.
      </Link>
      <p className="truncate px-3 pb-3 text-xs text-slate-400">{companyName}</p>
      <nav aria-label="Navegación principal" className="space-y-2">
        <div>
          <NavigationLinks active={active} dark items={primary} />
        </div>
        {modules.length > 0 && (
          <section aria-label="Módulos">
            <p className="px-3 pt-1 pb-1 text-[11px] font-semibold tracking-widest text-slate-400">
              MÓDULOS
            </p>
            <NavigationLinks active={active} dark items={modules} />
          </section>
        )}
        {consultation.length > 0 && (
          <div className="border-t border-slate-800 pt-2">
            <NavigationLinks active={active} dark items={consultation} />
          </div>
        )}
        {administration.length > 0 && (
          <div className="border-t border-slate-800 pt-2">
            <NavigationLinks active={active} dark items={administration} />
          </div>
        )}
      </nav>
      <p className="mt-auto px-3 pt-3 text-xs text-slate-400">
        Perú · America/Lima
      </p>
    </aside>
  );
}
