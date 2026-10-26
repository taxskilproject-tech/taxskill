"use client";

import { Button } from "@/components/atoms/button";
import { CheckboxField } from "@/components/molecules/checkbox-field";
import { FilterDisclosure } from "@/components/molecules/filter-disclosure";
import { SelectField } from "@/components/molecules/select-field";
import { MODULE_LABELS } from "@/domain/documents/constants/engine";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import type { ConfigurationFiltersProps } from "@/features/documents/types/configuration-filters.types";

export function ConfigurationFilters({
  filters,
  resource,
  busy,
}: ConfigurationFiltersProps) {
  const { context } = useWorkspace();
  const count = [
    filters.module,
    filters.active,
    filters.company,
    filters.deleted,
  ].filter(Boolean).length;
  return (
    <section
      className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:has-[details[open]]:grid-cols-1"
      aria-label="Buscar configuración documental"
    >
      <form
        className="flex gap-2"
        key={filters.query}
        onSubmit={(event) => {
          event.preventDefault();
          filters.setQuery(
            String(new FormData(event.currentTarget).get("q") ?? ""),
          );
        }}
      >
        <label className="sr-only" htmlFor={`${resource}-query`}>
          {resource === "catalog"
            ? "Buscar tipo por nombre o código"
            : "Buscar entregable o empresa"}
        </label>
        <input
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-blue-600"
          id={`${resource}-query`}
          name="q"
          type="search"
          maxLength={200}
          defaultValue={filters.query}
          placeholder={
            resource === "catalog"
              ? "Buscar tipo documental…"
              : "Buscar entregable o empresa…"
          }
        />
        <Button
          type="submit"
          loading={busy}
          loadingText="Buscando…"
          variant="secondary"
        >
          Buscar
        </Button>
      </form>
      <FilterDisclosure label="Filtros" count={count}>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            id={`${resource}-module`}
            label="Módulo"
            value={filters.module}
            onChange={(e) => filters.setModule(e.target.value)}
          >
            <option value="">Todos los módulos</option>
            {Object.entries(MODULE_LABELS)
              .filter(([key]) => resource === "rules" || key !== "actividades")
              .map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
          </SelectField>
          <SelectField
            id={`${resource}-active`}
            label="Estado"
            value={filters.active}
            onChange={(e) => filters.setActive(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="true">Activas</option>
            <option value="false">Pausadas o borradores</option>
          </SelectField>

          <CheckboxField
            id={`${resource}-deleted`}
            checked={filters.deleted}
            label="Incluir eliminados"
            onChange={(e) => filters.setDeleted(String(e.target.checked))}
          />
        </div>
      </FilterDisclosure>
      {(count > 0 || filters.query) && (
        <p className="text-xs text-slate-600 sm:col-span-full">
          Aplicados:{" "}
          {[
            filters.query,
            filters.module
              ? Object.entries(MODULE_LABELS).find(
                  ([key]) => key === filters.module,
                )?.[1]
              : "",
            filters.active === "true"
              ? "Activas"
              : filters.active === "false"
                ? "Pausadas / borradores"
                : "",
            context.companies.find((item) => item.id === filters.company)
              ?.legal_name,
            filters.deleted ? "Incluye eliminados" : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
    </section>
  );
}
