import Link from "next/link";

import { Button } from "@/components/atoms/button";
import { ResourceState } from "@/components/organisms/resource-state";
import { Pagination } from "@/features/access/components/pagination";
import { useCurrentRoute } from "@/features/access/hooks/use-current-route";
import { DocumentObligationCard } from "@/features/document-workspace/components/document-obligation";
import { DocumentResultsHeading } from "@/features/document-workspace/components/document-results-heading";
import { DocumentTypeNavigation } from "@/features/document-workspace/components/document-type-navigation";
import {
  DOCUMENT_MONTHS,
} from "@/features/document-workspace/constants/documents";
import type { DocumentPeriodResultsProps } from "@/features/document-workspace/types/document-workspace-ui.types";

export function DocumentPeriodResults({
  data,
  navigation,
  companyId,
  isAdmin,
  calendar,
}: DocumentPeriodResultsProps) {
  const origin = useCurrentRoute();
  const groups = data.groups;
  const selected = data.selected_code ?? groups[0]?.code ?? "";
  const group = groups.find((item) => item.code === selected);
  const changePage = (page: number) =>
    navigation.select("documentPage", String(page));
  return (
    <div className="grid items-start gap-3 lg:grid-cols-[248px_minmax(0,1fr)]">
      <DocumentTypeNavigation
        periodSummary={
          calendar ? (
            <div className="space-y-1">
              <p className="text-sm font-medium">Periodo</p>
              <Button
                className="w-full capitalize"
                variant="secondary"
                onClick={() => navigation.select("documentMonth", "")}
                aria-label="Cambiar periodo"
              >
                {
                  DOCUMENT_MONTHS.find(
                    (month) => month.value === navigation.month,
                  )?.label
                }{" "}
                {navigation.year}
              </Button>
            </div>
          ) : undefined
        }
        groups={groups}
        selected={selected}
        onSelect={(code) => navigation.select("documentType", code)}
      />
      <section
        className="min-w-0 space-y-2"
        aria-labelledby="document-document-heading"
      >
        <DocumentResultsHeading group={group} navigation={navigation} />
        {data.count > 25 && (
          <Pagination
            count={data.count}
            page={navigation.page}
            onPage={changePage}
          />
        )}
        {data.rows.map((obligation) => (
          <DocumentObligationCard
            key={obligation.id}
            obligation={obligation}
            origin={origin}
          />
        ))}
        {data.count === 0 && (
          <ResourceState
            kind="empty"
            title="Sin obligaciones para esta selección"
            description={
              group?.setup_state === "pending_responsible"
                ? "Pendiente de responsable. Asigna accesos y un responsable de entrega para iniciar el periodo vigente."
                : group?.setup_state === "scheduled"
                  ? `Programado para una fecha futura: ${group.starts_on}.`
                  : group?.setup_state === "paused"
                    ? "Este entregable está pausado. Su historial se conserva."
                    : navigation.state
                      ? "Prueba con otro estado o periodo."
                      : "Este tipo no tiene obligaciones generadas en la selección. Elige otro documento o revisa los entregables de la empresa."
            }
            action={
              isAdmin ? (
                <Link
                  className="inline-flex min-h-11 items-center text-sm font-medium text-blue-800 underline"
                  href={`/configuracion?tab=reglas&rulesCompany=${companyId}`}
                >
                  Configurar entregables de la empresa
                </Link>
              ) : undefined
            }
          />
        )}
        {data.count > 25 && (
          <Pagination
            count={data.count}
            page={navigation.page}
            onPage={changePage}
          />
        )}
      </section>
    </div>
  );
}
