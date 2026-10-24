import Link from "next/link";

import { NavigationLinks } from "@/features/auth/components/navigation-links";
import { NAVIGATION_GROUPS } from "@/features/auth/constants/navigation";
import type { MobileNavigationProps } from "@/features/auth/types/navigation.types";

export function WorkspaceSidebar({
  items,
  active,
  companyName,
}: MobileNavigationProps) {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col overflow-y-auto border-r border-zinc-200 bg-white p-3 lg:flex">
      <Link
        className="px-3 py-4 text-xl font-semibold tracking-tight"
        href="/dashboard"
      >
        TaxSkills.
      </Link>
      <p className="truncate px-3 text-xs text-zinc-500">{companyName}</p>
      <nav aria-label="Navegación principal" className="mt-4 space-y-3">
        {NAVIGATION_GROUPS.map((group) => {
          const entries = items.filter((item) => item.group === group);
          if (!entries.length) return null;
          return (
            <div key={group} className="space-y-1">
              <p className="px-3 text-xs font-medium text-zinc-500">{group}</p>
              <NavigationLinks active={active} items={entries} />
            </div>
          );
        })}
      </nav>
      <p className="mt-auto px-3 pt-6 text-xs text-zinc-500">
        Perú · America/Lima
      </p>
    </aside>
  );
}
