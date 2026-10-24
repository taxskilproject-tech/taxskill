"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ResourceState } from "@/components/organisms/resource-state";
import { PageHeading } from "@/features/access/components/page-heading";
import { documentaryModule } from "@/features/auth/utils/module-navigation";
import { CompaniesPage } from "@/features/companies/pages/companies-page";
import { ModuleCompanyPicker } from "@/features/companies/pages/module-company-picker";

export function CompaniesEntryPage() {
  const parameters = useSearchParams();
  if (!parameters.has("module")) return <CompaniesPage />;
  const moduleId = documentaryModule(parameters.get("module"));
  if (moduleId) return <ModuleCompanyPicker module={moduleId} />;
  return (
    <div className="space-y-3">
      <PageHeading
        title="Módulos"
        description="Selecciona un módulo disponible en el menú."
      />
      <ResourceState
        title="Módulo no encontrado"
        description="El módulo indicado no está disponible."
        kind="not-found"
      />
      <Link
        className="inline-flex min-h-11 items-center text-sm underline"
        href="/empresas"
      >
        Ver empresas
      </Link>
    </div>
  );
}
