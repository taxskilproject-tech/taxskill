import { companyPreparationSchema } from "@/domain/documents/contracts/template.schema";
import { QueryState } from "@/features/access/components/query-state";
import type { CompanyDetailProps } from "@/features/companies/types/company.types";
import { useDocumentQuery } from "@/features/documents/hooks/use-document-query";

export function CompanyCurrentDeliverables({ companyId }: CompanyDetailProps) {
  const query = useDocumentQuery(
    "company_preparation",
    { company_id: companyId },
    companyPreparationSchema,
  );
  return (
    <QueryState
      loading={query.isPending}
      error={query.error}
      retrying={query.isFetching}
      onRetry={() => {
        void query.refetch();
      }}
    >
      <section
        className="space-y-2"
        aria-label="Configuración documental conservada"
      >
        <p className="text-sm">
          Se conservan los {query.data?.rows.length ?? 0} entregables
          configurados en esta empresa. Una nueva versión de plantilla no
          reemplaza sus ajustes.
        </p>
        {query.data?.rows.map((row, index) => (
          <p key={row.id} className="border-b border-slate-100 py-2 text-sm">
            {String(index + 1).padStart(2, "0")} · {row.name} ·{" "}
            {row.pending
              ? "Pendiente de responsable"
              : row.active
                ? "Activo"
                : "Pausado"}
          </p>
        ))}
      </section>
    </QueryState>
  );
}
