"use client";
import Link from "next/link";

import {
  compliance,
  serializeReportFilters,
} from "@/domain/reporting/utils/report-filters";
import type { ReportMetricsProps } from "@/features/reporting/types/reporting-ui.types";

export function ReportMetrics({ metrics, filters, mode }: ReportMetricsProps) {
  const base = { ...filters, page: 1 };
  const destination = mode === "report" ? "/reportes" : "/dashboard";
  const cards = [
    { label: "Empresas activas", value: metrics.companies, href: "/empresas" },
    {
      label: "Obligaciones pendientes de aprobación",
      value: metrics.pending,
      href: `${destination}?${serializeReportFilters({ ...base, report: "pending" })}`,
    },
    {
      label: "Archivos por revisar",
      value: metrics.review_files,
      href: `${destination}?${serializeReportFilters({ ...base, indicator: "review" })}`,
    },
    {
      label: "Archivos observados",
      value: metrics.observed_files,
      href: `${destination}?${serializeReportFilters({ ...base, indicator: "observed" })}`,
    },
    {
      label: "Obligaciones con entrega vencida",
      value: metrics.overdue,
      href: `${destination}?${serializeReportFilters({ ...base, indicator: "overdue" })}`,
    },
    {
      label: "Obligaciones con próxima entrega",
      value: metrics.upcoming,
      href: `${destination}?${serializeReportFilters({ ...base, indicator: "upcoming" })}`,
    },
  ];
  return (
    <section
      aria-label="Indicadores del alcance consultado"
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-zinc-400 focus-visible:outline-2"
            href={card.href}
            key={card.label}
          >
            <p className="text-sm text-zinc-600">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {card.value.toLocaleString("es-PE")}
            </p>
          </Link>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-medium">Cumplimiento documental</h2>
          <p className="mt-3 text-3xl font-semibold">
            {compliance(metrics.approved, metrics.required)}
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            {metrics.approved} de {metrics.required} obligaciones exigibles
            aprobadas. Se suman obligaciones, sin promediar porcentajes.
          </p>
        </article>
        <article className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-medium">
            Actividades adicionales · indicador separado
          </h2>
          <p className="mt-3 text-3xl font-semibold">
            {compliance(
              metrics.additional_approved,
              metrics.additional_required,
            )}
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            {metrics.additional_approved} de {metrics.additional_required}{" "}
            actividades exigibles aprobadas en el alcance seleccionado.
          </p>
        </article>
      </div>
      <p className="text-xs leading-5 text-zinc-500">
        El atraso puede coexistir con observación o pendiente. Una entrega
        recibida a tiempo y aún sin revisar no está vencida. Los indicadores
        cuentan unidades distintas y no deben sumarse.
      </p>
    </section>
  );
}
