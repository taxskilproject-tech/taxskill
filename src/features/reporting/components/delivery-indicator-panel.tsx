"use client";
import { useState } from "react";

import { ResourceState } from "@/components/organisms/resource-state";
import { SidePanel } from "@/components/organisms/side-panel";
import { deliveryDetailsSchema } from "@/domain/reporting/contracts/followup.schema";
import { Pagination } from "@/features/access/components/pagination";
import { QueryState } from "@/features/access/components/query-state";
import { useCurrentRoute } from "@/features/access/hooks/use-current-route";

import { useReportQuery } from "../hooks/use-report-query";
import type { DeliveryPanelProps } from "../types/followup-ui.types";
import { DeliveryRows } from "./delivery-rows";

const LABELS = {
  compliance: "Cumplimiento documental",
  pending: "Pendientes de entrega",
  on_time: "Entregados a tiempo",
  late: "Fuera de plazo",
};

export function DeliveryIndicatorPanel({
  companyId,
  indicator,
  month,
  module,
  onClose,
}: DeliveryPanelProps) {
  const [page, setPage] = useState(1);
  const origin = useCurrentRoute();
  const query = useReportQuery(
    "delivery_details",
    {
      company_id: companyId,
      module,
      document_month: month,
      delivery_indicator: indicator,
      page,
    },
    deliveryDetailsSchema,
  );
  return (
    <SidePanel title={LABELS[indicator]} onClose={onClose} wide>
      <p className="mb-3 text-sm text-slate-600">Periodo documental {month}</p>
      <QueryState
        loading={query.isPending}
        error={query.error}
        retrying={query.isFetching}
        onRetry={() => {
          void query.refetch();
        }}
      >
        {query.data && (
          <div className="space-y-2">
            <Pagination count={query.data.count} page={page} onPage={setPage} />
            <DeliveryRows rows={query.data.rows} origin={origin} />
            {query.data.count === 0 && (
              <ResourceState
                kind="empty"
                title="Sin registros para este indicador"
                description="El periodo y la empresa seleccionados no tienen registros en esta categoría."
              />
            )}
            {query.data.count > 25 && (
              <Pagination
                count={query.data.count}
                page={page}
                onPage={setPage}
              />
            )}
          </div>
        )}
      </QueryState>
    </SidePanel>
  );
}
