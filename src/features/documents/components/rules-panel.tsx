"use client";
import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/atoms/button";
import { SelectField } from "@/components/molecules/select-field";
import { ResourceState } from "@/components/organisms/resource-state";
import { SidePanel } from "@/components/organisms/side-panel";
import { ruleRowSchema } from "@/domain/documents/contracts/document.schema";
import type { RuleRow } from "@/domain/documents/types/document.types";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { usePresentation } from "@/features/access/hooks/use-presentation";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { documentaryModule } from "@/features/auth/utils/module-navigation";
import { CompanyPreparationSummary } from "@/features/companies/components/company-preparation-summary";
import { ConfigurationFilters } from "@/features/documents/components/configuration-filters";
import { RuleForm } from "@/features/documents/components/rule-form";
import { RuleItem } from "@/features/documents/components/rule-item";
import { useConfigurationFilters } from "@/features/documents/hooks/use-configuration-filters";
import { useDocumentQuery } from "@/features/documents/hooks/use-document-query";

const rulesSchema = z.object({
  rows: z.array(ruleRowSchema),
  count: z.number(),
});
export function RulesPanel() {
  const [creatingFlag, setCreatingFlag] = usePresentation(
    "newDeliverable",
    "false",
    ["true", "false"],
  );
  const creating = creatingFlag === "true";
  const setCreating = (value: boolean) => setCreatingFlag(String(value));
  const { context, company } = useWorkspace();
  const [selected, setSelected] = useState<RuleRow>();
  const filters = useConfigurationFilters("rules");
  const { page, setPage } = filters;
  const companyId =
    filters.company || (company.kind === "company" ? company.companyId : "");
  const query = useDocumentQuery(
    "rules",
    { ...filters.input, company_id: companyId },
    rulesSchema,
    Boolean(companyId),
  );
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Entregables por empresa</h2>
          <p className="sr-only">
            Periodicidades, versiones, pausas y avance del generador común. Las
            condiciones históricas se conservan.
          </p>
        </div>
        <Button
          disabled={!companyId}
          onClick={() => {
            setSelected(undefined);
            setCreating(true);
          }}
        >
          Nuevo entregable
        </Button>
      </div>
      {creating && (
        <SidePanel
          title={
            selected ? "Nueva configuración del entregable" : "Nuevo entregable"
          }
          onClose={() => setCreating(false)}
          wide
        >
          <RuleForm
            key={selected?.id ?? "new"}
            onSaved={() => setCreating(false)}
            rule={selected}
            initialCompanyId={companyId}
            initialModule={documentaryModule(filters.module) ?? undefined}
          />
        </SidePanel>
      )}
      <SelectField
        id="deliverables-company"
        label="Empresa"
        value={companyId}
        onChange={(event) => filters.setCompany(event.target.value)}
      >
        <option value="">Seleccionar empresa</option>
        {context.companies.map((item) => (
          <option key={item.id} value={item.id}>
            {item.legal_name}
          </option>
        ))}
      </SelectField>
      {!companyId && (
        <ResourceState
          kind="empty"
          title="Selecciona una empresa"
          description="Verás sus entregables, estados y configuración sin mezclar los de otras empresas."
        />
      )}
      {companyId && (
        <>
          <CompanyPreparationSummary companyId={companyId} />
          <ConfigurationFilters
            filters={filters}
            resource="rules"
            busy={query.isFetching}
          />
          <QueryState
            error={query.error}
            loading={query.isPending}
            onRetry={() => {
              void query.refetch();
            }}
            retrying={query.isFetching}
          >
            <div className="space-y-1">
              <Pagination
                count={query.data?.count ?? 0}
                onPage={setPage}
                page={page}
              />
              {query.data?.rows.map((rule) => (
                <RuleItem
                  key={rule.id}
                  onEdit={() => {
                    setSelected(rule);
                    setCreating(true);
                  }}
                  rule={rule}
                />
              ))}
              {query.data?.count === 0 && (
                <p className="text-sm text-zinc-600">
                  Configura un entregable para iniciar el primer recorrido.
                </p>
              )}
              <Pagination
                count={query.data?.count ?? 0}
                onPage={setPage}
                page={page}
              />
            </div>
          </QueryState>
        </>
      )}
    </section>
  );
}
