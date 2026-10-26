import { companyPreparationSchema } from "@/domain/documents/contracts/template.schema";
import { QueryState } from "@/features/access/components/query-state";
import type { CompanyProfileChangesProps } from "@/features/companies/types/company-setup.types";
import { companyDocumentChanges } from "@/features/companies/utils/company-document-changes";
import { useDocumentQuery } from "@/features/documents/hooks/use-document-query";

export function CompanyProfileChanges({
  companyId,
  items,
  profile,
}: CompanyProfileChangesProps) {
  const query = useDocumentQuery(
    "company_preparation",
    { company_id: companyId },
    companyPreparationSchema,
  );
  const { additions, removed, kept } = companyDocumentChanges(
    query.data?.rows ?? [],
    items,
    profile,
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
        className="space-y-2 rounded-lg border border-slate-200 p-3"
        aria-label="Cambios del perfil documental"
      >
        <h3 className="font-semibold">Cambios antes de confirmar</h3>
        <p className="text-sm">
          {additions.length} por añadir · {removed.length} dejarán de
          solicitarse · {kept.length} conservan su configuración
        </p>
        {additions.map((item) => (
          <p key={item.code} className="text-sm text-blue-800">
            Añadir: {item.name}
          </p>
        ))}
        {removed.map((item) => (
          <p key={item.id} className="text-sm text-amber-800">
            Dejar de solicitar: {item.name}
          </p>
        ))}
        <p className="text-xs text-slate-600">
          Los ajustes propios compatibles y las pausas manuales se conservan.
          Las obligaciones emitidas, archivos y revisiones permanecen en el
          historial.
        </p>
      </section>
    </QueryState>
  );
}
