"use client";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { SidePanel } from "@/components/organisms/side-panel";
import { EmploymentForm } from "@/features/workers/components/employment-form";
import { EndEmploymentForm } from "@/features/workers/components/end-employment-form";
import { WorkerForm } from "@/features/workers/components/worker-form";
import type { EmploymentActionsProps } from "@/features/workers/types/worker-ui.types";

export function EmploymentActions({
  detail,
  canManage,
}: EmploymentActionsProps) {
  const [mode, setMode] = useState("");
  if (
    !canManage ||
    detail.worker.deleted_at ||
    detail.company_status !== "active"
  )
    return null;
  return (
    <section className="space-y-5">
      {!mode && (
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setMode("worker")} variant="secondary">
            Editar ficha
          </Button>
          {!detail.has_open_period && (
            <Button onClick={() => setMode("start")} variant="secondary">
              {detail.period_count
                ? "Registrar reingreso"
                : "Registrar ingreso"}
            </Button>
          )}
          {detail.selected_period && (
            <Button onClick={() => setMode("correct")} variant="secondary">
              Corregir etapa seleccionada
            </Button>
          )}
          {detail.selected_period && !detail.selected_period.end_date && (
            <Button onClick={() => setMode("end")} variant="secondary">
              Registrar cese
            </Button>
          )}
        </div>
      )}
      {mode && (
        <SidePanel
          title={
            mode === "end"
              ? "Registrar cese"
              : mode === "start"
                ? "Ingreso o reingreso"
                : "Editar expediente"
          }
          onClose={() => setMode("")}
        >
          {mode === "worker" && (
            <WorkerForm
              companyId={detail.worker.company_id}
              onCancel={() => setMode("")}
              onSaved={() => setMode("")}
              worker={detail.worker}
            />
          )}
          {(mode === "start" || mode === "correct") && (
            <EmploymentForm
              detail={detail}
              key={`${mode}:${detail.selected_period?.id}`}
              mode={mode}
              onSaved={() => setMode("")}
            />
          )}
          {mode === "end" && (
            <EndEmploymentForm detail={detail} onSaved={() => setMode("")} />
          )}
        </SidePanel>
      )}
    </section>
  );
}
