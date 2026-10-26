"use client";
import { useQuery } from "@tanstack/react-query";

import { ResourceState } from "@/components/organisms/resource-state";
import { PageHeading } from "@/features/access/components/page-heading";
import { QueryState } from "@/features/access/components/query-state";
import { usePresentation } from "@/features/access/hooks/use-presentation";
import { loadDirectory } from "@/features/access/repositories/access.repository";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { ConfigurationNavigation } from "@/features/configuration/components/configuration-navigation";
import { HistoryPanel } from "@/features/configuration/components/history-panel";
import { ParametersPanel } from "@/features/configuration/components/parameters-panel";
import { ResponsibleDirectory } from "@/features/configuration/components/responsible-directory";
import { RolesPanel } from "@/features/configuration/components/roles-panel";
import { CONFIGURATION_SECTIONS } from "@/features/configuration/constants/sections";
import { TemplatesPanel } from "@/features/deliverable-templates/components/templates-panel";
import { CatalogPanel } from "@/features/documents/components/catalog-panel";
import { RulesPanel } from "@/features/documents/components/rules-panel";
import { WhatsappPanel } from "@/features/notifications/components/whatsapp-panel";
import { OperationsPanel } from "@/features/operations/components/operations-panel";
import { useDataScope } from "@/lib/query/hooks/use-data-scope";
import { createScopedQueryKey } from "@/lib/query/utils/query-keys";

export function ConfigurationPage() {
  const { context } = useWorkspace();
  const scope = useDataScope();
  const [tab, setTab] = usePresentation(
    "tab",
    "catalogo",
    CONFIGURATION_SECTIONS.map((item) => item.id),
  );
  const directory = useQuery({
    queryKey: createScopedQueryKey(scope!, "directory"),
    queryFn: ({ signal }) => loadDirectory(context.organization.id, signal),
    enabled: context.member.is_admin && tab === "roles",
  });
  if (!context.member.is_admin)
    return (
      <ResourceState
        description="Solo el administrador configura el estudio."
        kind="forbidden"
        title="Acceso restringido"
      />
    );
  return (
    <div className="space-y-4">
      <PageHeading
        description="Documentación, accesos y operación del estudio."
        title="Configuración"
      />
      <div className="grid gap-4 xl:grid-cols-[190px_minmax(0,1fr)]">
        <ConfigurationNavigation selected={tab} onSelect={setTab} />
        <div className="min-w-0">
          {tab === "roles" && (
            <QueryState
              error={directory.error}
              loading={directory.isPending}
              onRetry={() => {
                void directory.refetch();
              }}
              retrying={directory.isFetching}
            >
              {directory.data && (
                <RolesPanel
                  directory={directory.data}
                  onChanged={() => {
                    void directory.refetch();
                  }}
                />
              )}
            </QueryState>
          )}
          {tab === "parametros" && <ParametersPanel />}
          {tab === "historial" && <HistoryPanel />}
          {tab === "responsables" && <ResponsibleDirectory />}
          {tab === "plantillas" && <TemplatesPanel />}
          {tab === "catalogo" && <CatalogPanel />}
          {tab === "reglas" && <RulesPanel />}
          {tab === "whatsapp" && <WhatsappPanel />}
          {tab === "operacion" && <OperationsPanel />}
        </div>
      </div>
    </div>
  );
}
