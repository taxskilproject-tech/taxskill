import { Badge } from "@/components/atoms/badge";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { SUNAT_STATUS_LABELS } from "@/domain/sunat/constants/sunat";

import type { SunatWorkspaceProps } from "../types/ui.types";
import {
  activeSunatJob,
  sunatDate,
  sunatErrorMessage,
} from "../utils/presentation";

export function SunatConnectionStatus({ workspace }: SunatWorkspaceProps) {
  const connection = workspace.connection;
  const active = activeSunatJob(workspace);
  const latest = workspace.jobs[0];
  return (
    <div className="space-y-2">
      {workspace.worker_mode === "simulator" && (
        <p role="status" className="text-xs font-medium text-amber-900">
          Simulador local: datos ficticios, sin conexión a SUNAT.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
        <Badge tone={connection?.state === "connected" ? "success" : "warning"}>
          {connection
            ? SUNAT_STATUS_LABELS[connection.state]
            : "Sin conexión configurada"}
        </Badge>
        <span>
          Última consulta correcta:{" "}
          {sunatDate(connection?.last_success_at ?? null)}
        </span>
        {connection?.daily_enabled && (
          <span>
            Revisión diaria: {connection.daily_time.slice(0, 5)} · Lima
          </span>
        )}
      </div>
      {!workspace.worker_ready && (
        <FeedbackMessage kind="warning">
          El servicio de consultas no está disponible. Puedes consultar la
          información guardada; avisa al administrador para restablecer el
          servicio.
        </FeedbackMessage>
      )}
      {workspace.dispatcher_error_code &&
        workspace.dispatcher_error_code !== latest?.error_code &&
        workspace.dispatcher_error_code !== connection?.error_code && (
          <FeedbackMessage kind="error">
            {sunatErrorMessage(workspace.dispatcher_error_code)}
          </FeedbackMessage>
        )}
      {active && (
        <FeedbackMessage>
          {SUNAT_STATUS_LABELS[active.state]} · {active.progress.pages ?? 0}{" "}
          páginas aceptadas · {active.progress.messages ?? 0} registros
          recuperados.
        </FeedbackMessage>
      )}
      {!active && latest?.error_code && (
        <FeedbackMessage kind="error">
          {sunatErrorMessage(latest.error_code)}
        </FeedbackMessage>
      )}
      {!active &&
        connection?.error_code &&
        connection.error_code !== latest?.error_code && (
          <FeedbackMessage kind="error">
            {sunatErrorMessage(connection.error_code)}
          </FeedbackMessage>
        )}
    </div>
  );
}
