"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { SidePanel } from "@/components/organisms/side-panel";
import type { Company } from "@/domain/access/types/access.types";
import { ListToolbar } from "@/features/access/components/list-toolbar";
import { PageHeading } from "@/features/access/components/page-heading";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { useCurrentRoute } from "@/features/access/hooks/use-current-route";
import { useDirectoryFilters } from "@/features/access/hooks/use-directory-filters";
import {
  listCompanies,
  loadDirectory,
} from "@/features/access/repositories/access.repository";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { CompanyForm } from "@/features/companies/components/company-form";
import { CompanyList } from "@/features/companies/components/company-list";
import { useDataScope } from "@/lib/query/hooks/use-data-scope";
import { createScopedQueryKey } from "@/lib/query/utils/query-keys";

export function CompaniesPage() {
  const { context, company } = useWorkspace();
  const scope = useDataScope();
  const [filter, setFilter] = useDirectoryFilters();
  const origin = useCurrentRoute();
  const [editing, setEditing] = useState<Company | "new" | null>(null);
  const companies = useQuery({
    queryKey: createScopedQueryKey(scope!, "companies", { ...filter }),
    queryFn: ({ signal }) =>
      listCompanies(
        context.organization.id,
        filter,
        signal,
        company.kind === "company"
          ? [company.companyId]
          : company.kind === "internal"
            ? []
            : undefined,
      ),
    enabled: context.member.is_admin,
  });
  const directory = useQuery({
    queryKey: createScopedQueryKey(scope!, "directory"),
    queryFn: ({ signal }) => loadDirectory(context.organization.id, signal),
    enabled: context.member.is_admin,
  });
  const allowedIds = context.companies
    .filter(
      (item) =>
        company.kind === "all" ||
        (company.kind === "company" && item.id === company.companyId),
    )
    .map((item) => item.id);
  const visibleCompanies = useQuery({
    queryKey: createScopedQueryKey(scope!, "assigned-companies", { ...filter }),
    queryFn: async ({ signal }) => {
      const result = await listCompanies(
        context.organization.id,
        { ...filter, deleted: false },
        signal,
        allowedIds,
      );
      return result;
    },
    enabled: !context.member.is_admin,
  });
  const rows =
    (context.member.is_admin
      ? companies.data?.rows
      : visibleCompanies.data?.rows) ?? [];
  const filtered = rows.filter(
    (row) =>
      (company.kind === "all" ||
        (company.kind === "company" && row.id === company.companyId)) &&
      row.legal_name.toLowerCase().includes(filter.query.toLowerCase()),
  );
  function changed() {
    setEditing(null);
    void companies.refetch();
  }
  const active = context.member.is_admin ? companies : visibleCompanies;
  return (
    <div className="space-y-6">
      <PageHeading
        action={
          context.member.is_admin && (
            <Button onClick={() => setEditing("new")}>Nueva empresa</Button>
          )
        }
        description="Información administrativa y acceso al expediente de cada empresa."
        title="Empresas"
      />
      {editing && directory.data && (
        <SidePanel
          title={editing === "new" ? "Nueva empresa" : "Editar empresa"}
          onClose={() => setEditing(null)}
        >
          <CompanyForm
            company={editing === "new" ? undefined : editing}
            directory={directory.data}
            key={editing === "new" ? "new" : editing.id + editing.revision}
            onCancel={() => setEditing(null)}
            onSaved={changed}
          />
        </SidePanel>
      )}
      <ListToolbar
        allowDeleted={context.member.is_admin}
        deleted={filter.deleted}
        onDeleted={(deleted) => setFilter({ ...filter, page: 1, deleted })}
        onQuery={(query) => setFilter({ ...filter, page: 1, query })}
        query={filter.query}
      />
      <QueryState
        error={active.error ?? directory.error}
        loading={active.isPending}
        onRetry={() => {
          void active.refetch();
        }}
        retrying={active.isFetching}
      >
        <Pagination
          count={active.data?.count ?? 0}
          onPage={(page) => setFilter({ ...filter, page })}
          page={filter.page}
        />
        <CompanyList
          origin={origin}
          companies={filtered}
          isAdmin={context.member.is_admin}
          onChanged={changed}
          onEdit={setEditing}
        />
        <Pagination
          count={active.data?.count ?? 0}
          onPage={(page) => setFilter({ ...filter, page })}
          page={filter.page}
        />
      </QueryState>
    </div>
  );
}
