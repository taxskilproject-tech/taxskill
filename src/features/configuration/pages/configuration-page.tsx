"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ResourceState } from "@/components/organisms/resource-state";
import { PageHeading } from "@/features/access/components/page-heading";
import { QueryState } from "@/features/access/components/query-state";
import { loadDirectory } from "@/features/access/repositories/access.repository";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { ParametersPanel } from "@/features/configuration/components/parameters-panel";
import { RolesPanel } from "@/features/configuration/components/roles-panel";
import { CatalogPanel } from "@/features/documents/components/catalog-panel";
import { RulesPanel } from "@/features/documents/components/rules-panel";
import { WhatsappPanel } from "@/features/notifications/components/whatsapp-panel";
import { OperationsPanel } from "@/features/operations/components/operations-panel";
import { useDataScope } from "@/lib/query/hooks/use-data-scope";
import { createScopedQueryKey } from "@/lib/query/utils/query-keys";

const TABS = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "catalogo", label: "Catálogo" },
  { id: "reglas", label: "Reglas" },
  { id: "roles", label: "Roles y permisos" },
  { id: "responsables", label: "Responsables" },
  { id: "parametros", label: "Parámetros e historial" },
  { id: "operacion", label: "Operación" },
];

export function ConfigurationPage() {
  const { context } = useWorkspace();
  const scope = useDataScope();
  const parameters = useSearchParams();
  const tab =
    TABS.find((item) => item.id === parameters.get("tab"))?.id ?? "catalogo";
  const directory = useQuery({
    queryKey: createScopedQueryKey(scope!, "directory"),
    queryFn: ({ signal }) => loadDirectory(context.organization.id, signal),
    enabled: context.member.is_admin,
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
    <div className="space-y-6">
      <PageHeading
        description="Parámetros comunes, plantillas de permisos y responsables de entrega."
        title="Configuración"
      />
      <nav
        aria-label="Secciones de configuración"
        className="flex gap-2 overflow-x-auto border-b border-zinc-200 pb-3"
      >
        {TABS.map((item) => (
          <Link
            aria-current={item.id === tab ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center rounded-lg px-4 text-sm ${item.id === tab ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
            href={`/configuracion?tab=${item.id}`}
            key={item.id}
          >
            {item.label}
          </Link>
        ))}
      </nav>
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
      {tab === "responsables" && (
        <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="font-semibold">Responsables por empresa y módulo</h2>
          <p className="text-sm leading-6 text-zinc-600">
            Configúralos en la ficha de cada empresa después de asignar sus
            permisos de entrega. El contador y supervisor administrativos no
            reemplazan esta elección.
          </p>
          <Link
            className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4"
            href="/empresas"
          >
            Ir a empresas →
          </Link>
        </section>
      )}
      {tab === "catalogo" && <CatalogPanel />}
      {tab === "reglas" && <RulesPanel />}
      {tab === "whatsapp" && <WhatsappPanel />}
      {tab === "operacion" && <OperationsPanel />}
    </div>
  );
}
