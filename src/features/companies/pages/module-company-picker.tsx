"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { ResourceState } from "@/components/organisms/resource-state";
import { MODULE_LABELS } from "@/domain/documents/constants/engine";
import { ListToolbar } from "@/features/access/components/list-toolbar";
import { PageHeading } from "@/features/access/components/page-heading";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { useCurrentRoute } from "@/features/access/hooks/use-current-route";
import { useDirectoryFilters } from "@/features/access/hooks/use-directory-filters";
import { listCompanies } from "@/features/access/repositories/access.repository";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { moduleCompanies } from "@/features/auth/utils/module-navigation";
import { ModuleCompanyRows } from "@/features/companies/components/module-company-rows";
import type { ModuleCompanyProps } from "@/features/companies/types/company.types";
import { useDataScope } from "@/lib/query/hooks/use-data-scope";
import { createScopedQueryKey } from "@/lib/query/utils/query-keys";

export function ModuleCompanyPicker({ module }: ModuleCompanyProps) {
  const { context } = useWorkspace();
  const scope = useDataScope();
  const origin = useCurrentRoute();
  const [filter, setFilter] = useDirectoryFilters();
  const ids = moduleCompanies(context, module).map((company) => company.id);
  const query = useQuery({
    queryKey: createScopedQueryKey(scope!, "module-companies", {
      module,
      page: filter.page,
      q: filter.query,
      ids: ids.join(","),
    }),
    queryFn: ({ signal }) =>
      listCompanies(
        context.organization.id,
        { ...filter, deleted: false },
        signal,
        ids,
      ),
    enabled: ids.length > 0,
  });
  return (
    <section className="space-y-3">
      <PageHeading
        title={MODULE_LABELS[module]}
        description="Selecciona la empresa con la que vas a trabajar."
      />
      <ListToolbar
        allowDeleted={false}
        deleted={false}
        query={filter.query}
        onQuery={(query) => setFilter({ ...filter, query, page: 1 })}
        onDeleted={() => undefined}
      />
      <QueryState
        error={query.error}
        loading={ids.length > 0 && query.isPending}
        retrying={query.isFetching}
        onRetry={() => {
          void query.refetch();
        }}
      >
        <Pagination
          count={query.data?.count ?? 0}
          page={filter.page}
          onPage={(page) => setFilter({ ...filter, page })}
        />
        {query.data?.rows.length ? (
          <ModuleCompanyRows
            companies={query.data.rows}
            module={module}
            origin={origin}
          />
        ) : (
          <ResourceState
            kind="empty"
            title="Sin empresas disponibles"
            description="No hay empresas operativas con acceso a este módulo para esta consulta."
          />
        )}
        <Pagination
          count={query.data?.count ?? 0}
          page={filter.page}
          onPage={(page) => setFilter({ ...filter, page })}
        />
      </QueryState>
      {context.member.is_admin && (
        <Link
          className="inline-flex min-h-11 items-center text-sm underline"
          href="/empresas"
        >
          Gestionar empresas
        </Link>
      )}
    </section>
  );
}
