"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ResourceState } from "@/components/organisms/resource-state";
import { PageHeading } from "@/features/access/components/page-heading";
import { QueryState } from "@/features/access/components/query-state";
import {
  loadCompany,
  loadDirectory,
  loadModuleSettings,
} from "@/features/access/repositories/access.repository";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { safeReturnTo } from "@/features/auth/utils/safe-return-to";
import { CompanyOverview } from "@/features/companies/components/company-overview";
import { ModuleSettingsPanel } from "@/features/companies/components/module-settings-panel";
import type { CompanyDetailProps } from "@/features/companies/types/company.types";
import { CompanyDocumentTabs } from "@/features/documents/components/company-document-tabs";
import { useDataScope } from "@/lib/query/hooks/use-data-scope";
import { createScopedQueryKey } from "@/lib/query/utils/query-keys";

export function CompanyDetailPage({ companyId }: CompanyDetailProps) {
  const { context, company: companyScope } = useWorkspace();
  const scope = useDataScope();
  const parameters = useSearchParams();
  const adminView =
    context.member.is_admin && parameters.get("tab") === "administracion";
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
    enabled: authorized && adminView,
  });
  const settings = useQuery({
    queryKey: createScopedQueryKey(scope!, "module-settings", { companyId }),
    queryFn: ({ signal }) =>
      loadModuleSettings(context.organization.id, companyId, signal),
    enabled: authorized && adminView,
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
    <div className="space-y-3">
      <Link
        scroll={false}
        className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
        href={
          parameters.get("returnTo")
            ? safeReturnTo(parameters.get("returnTo"))
            : "/empresas"
        }
      >
        ← Empresas
      </Link>
      <QueryState
        error={company.error}
        loading={company.isPending}
        onRetry={() => {
          void company.refetch();
        }}
        retrying={company.isFetching}
      >
        {company.data && !company.data.deleted_at ? (
          <>
            <PageHeading
              description={`RUC ${company.data.ruc} · Control desde ${company.data.control_start_date}`}
              title={company.data.legal_name}
            />
            <CompanyDocumentTabs
              companyId={companyId}
              summary={<CompanyOverview company={company.data} />}
              administration={
                <QueryState
                  error={directory.error ?? settings.error}
                  loading={directory.isPending || settings.isPending}
                  onRetry={() => {
                    void directory.refetch();
                    void settings.refetch();
                  }}
                  retrying={directory.isFetching || settings.isFetching}
                >
                  {directory.data && (
                    <ModuleSettingsPanel
                      company={company.data}
                      directory={directory.data}
                      settings={settings.data ?? []}
                      onChanged={() => {
                        void settings.refetch();
                      }}
                    />
                  )}
                </QueryState>
              }
            />
          </>
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
