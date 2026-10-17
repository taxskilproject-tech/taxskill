"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { ResourceState } from "@/components/organisms/resource-state";
import { PageHeading } from "@/features/access/components/page-heading";
import { QueryState } from "@/features/access/components/query-state";
import {
  loadCompany,
  loadDirectory,
  loadModuleSettings,
} from "@/features/access/repositories/access.repository";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { ModuleSettingsPanel } from "@/features/companies/components/module-settings-panel";
import type { CompanyDetailProps } from "@/features/companies/types/company.types";
import { CompanyDocumentTabs } from "@/features/documents/components/company-document-tabs";
import { CompanyReportingSummary } from "@/features/reporting/components/company-reporting-summary";
import { useDataScope } from "@/lib/query/hooks/use-data-scope";
import { createScopedQueryKey } from "@/lib/query/utils/query-keys";

export function CompanyDetailPage({ companyId }: CompanyDetailProps) {
  const { context, company: companyScope } = useWorkspace();
  const scope = useDataScope();
  const authorized =
    context.companies.some((item) => item.id === companyId) &&
    companyScope.kind !== "internal" &&
    (companyScope.kind !== "company" || companyScope.companyId === companyId);
  const company = useQuery({
    queryKey: createScopedQueryKey(scope!, "company", { companyId }),
    queryFn: ({ signal }) =>
      loadCompany(context.organization.id, companyId, signal),
    enabled: authorized,
  });
  const directory = useQuery({
    queryKey: createScopedQueryKey(scope!, "directory"),
    queryFn: ({ signal }) => loadDirectory(context.organization.id, signal),
    enabled: authorized && context.member.is_admin,
  });
  const settings = useQuery({
    queryKey: createScopedQueryKey(scope!, "module-settings", { companyId }),
    queryFn: ({ signal }) =>
      loadModuleSettings(context.organization.id, companyId, signal),
    enabled: authorized && context.member.is_admin,
  });
  if (!authorized)
    return (
      <ResourceState
        description="La empresa no existe o no está disponible para tu cuenta."
        kind="not-found"
        title="Empresa no encontrada"
      />
    );
  return (
    <div className="space-y-6">
      <Link
        className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
        href="/empresas"
      >
        ← Volver a empresas
      </Link>
      <QueryState
        error={company.error ?? directory.error ?? settings.error}
        loading={company.isPending}
        onRetry={() => {
          void company.refetch();
        }}
        retrying={company.isFetching}
      >
        {company.data && !company.data.deleted_at ? (
          <div className="space-y-7">
            <PageHeading
              description={`RUC ${company.data.ruc} · Control desde ${company.data.control_start_date}`}
              title={company.data.legal_name}
            />
            <section className="grid gap-5 rounded-xl border border-zinc-200 bg-white p-6 sm:grid-cols-3">
              <div>
                <p className="text-xs text-zinc-500">Estado</p>
                <p className="mt-2 text-sm">
                  {company.data.status === "active"
                    ? "Activa"
                    : company.data.status === "inactive"
                      ? "Inactiva"
                      : "Suspendida"}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Régimen informado</p>
                <p className="mt-2 text-sm">
                  {company.data.tax_regime ?? "Sin registrar"}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Contacto</p>
                <p className="mt-2 text-sm break-words">
                  {company.data.contact_email ?? "Sin registrar"}
                </p>
              </div>
            </section>
            <CompanyReportingSummary companyId={companyId} />
            <CompanyDocumentTabs companyId={companyId} />
            {context.member.is_admin && directory.data && (
              <ModuleSettingsPanel
                company={company.data}
                directory={directory.data}
                settings={settings.data ?? []}
                onChanged={() => {
                  void settings.refetch();
                }}
              />
            )}
          </div>
        ) : (
          <ResourceState
            description="La empresa no existe o fue eliminada."
            kind="not-found"
            title="Empresa no encontrada"
          />
        )}
      </QueryState>
    </div>
  );
}
