import type { CompanyOverviewProps } from "@/features/companies/types/company.types";
import { CompanyReportingSummary } from "@/features/reporting/components/company-reporting-summary";

export function CompanyOverview({ company }: CompanyOverviewProps) {
  return (
    <section className="space-y-3">
      <dl className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-zinc-500">Estado</dt>
          <dd>
            {company.status === "active"
              ? "Activa"
              : company.status === "inactive"
                ? "Inactiva"
                : "Suspendida"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Régimen informado</dt>
          <dd>{company.tax_regime ?? "Sin registrar"}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Contacto</dt>
          <dd className="break-all">
            {company.contact_email ?? "Sin registrar"}
          </dd>
        </div>
      </dl>
      <CompanyReportingSummary companyId={company.id} />
    </section>
  );
}
