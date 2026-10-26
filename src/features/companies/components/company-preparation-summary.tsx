import { TAX_REGIMES } from "@/domain/company-profile/constants/regimes";
import { companyPreparationSchema } from "@/domain/documents/contracts/template.schema";
import { QueryState } from "@/features/access/components/query-state";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import type { CompanyDetailProps } from "@/features/companies/types/company.types";
import { useDocumentQuery } from "@/features/documents/hooks/use-document-query";

export function CompanyPreparationSummary({ companyId }: CompanyDetailProps) {
  const { context } = useWorkspace();
  const company = context.companies.find((item) => item.id === companyId);
  const query = useDocumentQuery(
    "company_preparation",
    { company_id: companyId },
    companyPreparationSchema,
  );
  const rows = query.data?.rows ?? [];
  const profile = company?.documentary_profile;
  const modules = [
    profile?.igv_renta ? "Tributario" : "",
    profile?.plame ? "Laboral por trabajador y Laboral general" : "",
  ].filter(Boolean);
  return (
    <QueryState
      loading={query.isPending}
      error={query.error}
      retrying={query.isFetching}
      onRetry={() => {
        void query.refetch();
      }}
    >
      <p className="text-sm text-slate-600" role="status">
        {TAX_REGIMES.find((regime) => regime.code === company?.tax_regime_code)
          ?.label ?? "Configuración anterior"}
        {modules.length > 0 && ` · ${modules.join(" · ")}`} ·{" "}
        {rows.filter((row) => row.pending).length} pendientes de responsable ·{" "}
        {rows.filter((row) => row.active).length} activos ·{" "}
        {rows.filter((row) => !row.active && !row.pending).length} pausados o
        borradores
      </p>
    </QueryState>
  );
}
