"use client";
import { FormField } from "@/components/molecules/form-field";
import { SelectField } from "@/components/molecules/select-field";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { AuditFilters } from "@/features/reporting/components/audit-filters";
import { DocumentFilters } from "@/features/reporting/components/document-filters";
import type { ReportFilterProps } from "@/features/reporting/types/reporting-ui.types";

export function ReportFilters({
  filters,
  onChange,
  audit = false,
}: ReportFilterProps) {
  const { context, company } = useWorkspace();
  return (
    <section
      aria-label="Filtros de consulta"
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5"
    >
      {!audit && (
        <form
          className="flex flex-wrap items-end gap-3"
          key={filters.q}
          onSubmit={(event) => {
            event.preventDefault();
            onChange(
              "q",
              String(new FormData(event.currentTarget).get("search") ?? ""),
            );
          }}
        >
          <div className="min-w-0 flex-1">
            <FormField
              defaultValue={filters.q}
              id="report-search"
              label="Buscar por título, empresa, trabajador, identificación o tipo"
              maxLength={200}
              name="search"
              type="search"
            />
          </div>
          <button
            className="min-h-11 rounded-lg border border-zinc-300 px-4 text-sm hover:bg-zinc-50 focus-visible:outline-2"
            type="submit"
          >
            Buscar
          </button>
        </form>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SelectField
          disabled={company.kind !== "all"}
          id="report-company"
          label="Empresa"
          onChange={(e) => onChange("company_id", e.target.value)}
          value={filters.company_id ?? ""}
        >
          <option value="">Todas las disponibles</option>
          {context.companies.map((item) => (
            <option key={item.id} value={item.id}>
              {item.legal_name}
            </option>
          ))}
        </SelectField>
        <SelectField
          id="report-module"
          label="Área"
          onChange={(e) => onChange("module", e.target.value)}
          value={filters.module ?? ""}
        >
          <option value="">Todas las áreas</option>
          <option value="tributario">Tributario</option>
          <option value="laboral_trabajador">Laboral por trabajador</option>
          <option value="laboral_general">Laboral general</option>
          <option value="actividades">Actividades adicionales</option>
        </SelectField>
        <FormField
          id="report-period"
          label={audit ? "Mes del evento (AAAA-MM)" : "Clave de periodo"}
          onChange={(e) => onChange("period", e.target.value)}
          value={filters.period ?? ""}
        />
      </div>
      <details>
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
          Más filtros y consulta histórica
        </summary>
        <div className="grid gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-3">
          {audit ? (
            <AuditFilters filters={filters} onChange={onChange} />
          ) : (
            <DocumentFilters filters={filters} onChange={onChange} />
          )}
          {context.member.is_admin && (
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                checked={filters.include_deleted}
                className="size-4 accent-zinc-950"
                onChange={(e) =>
                  onChange("include_deleted", String(e.target.checked))
                }
                type="checkbox"
              />
              Incluir inactivos y eliminados (histórico)
            </label>
          )}
        </div>
      </details>
    </section>
  );
}
