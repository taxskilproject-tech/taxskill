"use client";
import { Button } from "@/components/atoms/button";
import { FilterDisclosure } from "@/components/molecules/filter-disclosure";
import { FormField } from "@/components/molecules/form-field";
import { SelectField } from "@/components/molecules/select-field";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { AuditFilters } from "@/features/reporting/components/audit-filters";
import { DocumentFilters } from "@/features/reporting/components/document-filters";
import type { ReportFilterProps } from "@/features/reporting/types/reporting-ui.types";
import { activeReportFilters } from "@/features/reporting/utils/active-report-filters";

export function ReportFilters({
  filters,
  onChange,
  audit = false,
  busy = false,
}: ReportFilterProps) {
  const { context, company } = useWorkspace();
  const active = activeReportFilters(filters);
  return (
    <section
      aria-label="Filtros de consulta"
      className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:has-[details[open]]:grid-cols-1"
    >
      {!audit && (
        <form
          className="flex items-end gap-2"
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
            <label className="sr-only" htmlFor="report-search">
              Buscar por título, empresa, trabajador, identificación o tipo
            </label>
            <input
              className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm focus-visible:outline-2"
              defaultValue={filters.q}
              id="report-search"
              maxLength={200}
              name="search"
              placeholder="Buscar documentos, empresas o trabajadores…"
              type="search"
            />
          </div>
          <Button
            loading={busy}
            loadingText="Buscando…"
            type="submit"
            variant="secondary"
          >
            Buscar
          </Button>
        </form>
      )}
      <FilterDisclosure
        count={active.length}
        label={audit ? "Filtros de auditoría" : "Filtros de consulta"}
      >
        {active.length > 0 && (
          <p className="text-xs text-zinc-600">
            Aplicados: {active.join(" · ")}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
            label="Módulo"
            onChange={(e) => onChange("module", e.target.value)}
            value={filters.module ?? ""}
          >
            <option value="">Todos los módulos</option>
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
          {audit ? (
            <AuditFilters filters={filters} onChange={onChange} />
          ) : (
            <DocumentFilters filters={filters} onChange={onChange} />
          )}
          {context.member.is_admin && (
            <label className="flex min-h-11 items-center gap-2 text-sm">
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
      </FilterDisclosure>
    </section>
  );
}
