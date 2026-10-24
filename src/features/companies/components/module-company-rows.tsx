import Link from "next/link";

import { moduleDestination } from "@/features/auth/utils/module-navigation";
import type { ModuleCompanyRowsProps } from "@/features/companies/types/company.types";

export function ModuleCompanyRows({
  companies,
  module,
  origin,
}: ModuleCompanyRowsProps) {
  return (
    <ul
      aria-label="Empresas disponibles para el módulo"
      className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white"
    >
      {companies.map((company) => (
        <li key={company.id}>
          <Link
            className="flex min-h-11 items-center justify-between gap-3 p-3 text-sm focus-visible:outline-2 hover:bg-zinc-50"
            href={`${moduleDestination(module, company.id)}&returnTo=${encodeURIComponent(origin)}`}
          >
            <span className="min-w-0">
              <span className="block font-medium break-words">
                {company.legal_name}
              </span>
              <span className="text-xs text-zinc-500">RUC {company.ruc}</span>
            </span>
            <span aria-hidden="true" className="shrink-0">
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
