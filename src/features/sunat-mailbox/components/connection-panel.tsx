"use client";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { SidePanel } from "@/components/organisms/side-panel";

import { useSunatAction } from "../hooks/use-sunat-action";
import type { SunatConnectionPanelProps } from "../types/ui.types";
import { activeSunatJob } from "../utils/presentation";
import { SunatCredentialsForm } from "./credentials-form";
import { SunatScheduleForm } from "./schedule-form";

export function SunatConnectionPanel({
  workspace,
  onChanged,
  onClose,
}: SunatConnectionPanelProps) {
  const action = useSunatAction();
  const [confirm, setConfirm] = useState(false);
  const connection = workspace.connection;
  const active = activeSunatJob(workspace);
  async function disconnect() {
    if (!connection) return;
    if (
      await action.submit("Disconnect", {
        company_id: workspace.company.id,
        expected_revision: connection.revision,
      })
    ) {
      onChanged();
      setConfirm(false);
    }
  }
  async function cancel() {
    if (!active || !connection) return;
    if (
      await action.submit("CancelJob", {
        company_id: workspace.company.id,
        expected_revision: connection.revision,
        job_id: active.id,
      })
    )
      onChanged();
  }
  return (
    <SidePanel
      title={"Conexión SUNAT · " + workspace.company.legal_name}
      onClose={onClose}
    >
      <div className="space-y-5">
        {!workspace.worker_ready && (
          <FeedbackMessage kind="warning">
            El servicio de consultas debe estar disponible para guardar y
            verificar la conexión.
          </FeedbackMessage>
        )}
        <SunatCredentialsForm workspace={workspace} onChanged={onChanged} />
        <SunatScheduleForm
          workspace={workspace}
          onChanged={onChanged}
          key={connection?.revision}
        />
        {active && (
          <Button
            variant="secondary"
            onClick={() => {
              void cancel();
            }}
            loading={action.busy}
            loadingText="Cancelando consulta…"
          >
            Cancelar consulta en curso
          </Button>
        )}
        {connection && connection.state !== "disconnected" && (
          <div className="space-y-3 border-t border-slate-200 pt-4">
            {confirm ? (
              <>
                <FeedbackMessage kind="warning">
                  Se eliminarán las credenciales guardadas y se detendrán las
                  consultas. Los mensajes y adjuntos ya recuperados conservarán
                  su historial.
                </FeedbackMessage>
                <Button
                  variant="danger"
                  loading={action.busy}
                  loadingText="Desconectando…"
                  onClick={() => {
                    void disconnect();
                  }}
                >
                  Confirmar desconexión
                </Button>
                <Button
                  variant="secondary"
                  disabled={action.busy}
                  onClick={() => setConfirm(false)}
                >
                  Volver
                </Button>
              </>
            ) : (
              <Button variant="secondary" onClick={() => setConfirm(true)}>
                Desconectar empresa
              </Button>
            )}
          </div>
        )}
        {action.error && (
          <FeedbackMessage kind="error">{action.error}</FeedbackMessage>
        )}
      </div>
    </SidePanel>
  );
}
