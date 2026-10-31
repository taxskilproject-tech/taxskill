"use client";
import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { SidePanel } from "@/components/organisms/side-panel";
import { sunatDetailSchema } from "@/domain/sunat/contracts/sunat.schema";
import { QueryState } from "@/features/access/components/query-state";

import { useSunatAction } from "../hooks/use-sunat-action";
import { useSunatQuery } from "../hooks/use-sunat-query";
import type { SunatDetailPanelProps } from "../types/ui.types";
import { SunatAttachmentControl } from "./attachment-control";

export function SunatMessageDetailPanel({
  companyId,
  messageId,
  onClose,
  onChanged,
}: SunatDetailPanelProps) {
  const detail = useSunatQuery(
    "message",
    { company_id: companyId, message_id: messageId },
    sunatDetailSchema,
  );
  const action = useSunatAction();
  function changed() {
    void detail.refetch();
    onChanged();
  }
  async function load() {
    await action.submit(
      "RequestMessage",
      { company_id: companyId, message_id: messageId },
      true,
    );
    changed();
  }
  return (
    <SidePanel title="Mensaje del Buzón SUNAT" onClose={onClose} wide>
      <QueryState
        loading={detail.isPending}
        error={detail.error}
        retrying={detail.isFetching}
        onRetry={() => {
          void detail.refetch();
        }}
      >
        {detail.data && (
          <section className="space-y-4">
            <p className="text-xs text-slate-600">
              {detail.data.message.published_on.split("-").reverse().join("/")}
            </p>
            <h3 className="break-words text-lg font-semibold">
              {detail.data.message.subject}
            </h3>
            {!detail.data.message.details_loaded_at && (
              <>
                <p className="text-sm text-slate-600">
                  Recupera el contenido y la lista de adjuntos desde SUNAT. Esta
                  acción puede marcar el mensaje como leído.
                </p>
                <Button
                  loading={action.busy}
                  loadingText="Recuperando mensaje y adjuntos…"
                  onClick={() => {
                    void load();
                  }}
                >
                  Cargar mensaje y adjuntos
                </Button>
              </>
            )}
            {action.error && (
              <FeedbackMessage kind="error">{action.error}</FeedbackMessage>
            )}
            {detail.data.message.details_loaded_at && (
              <>
                <h4 className="font-medium">Adjuntos</h4>
                {detail.data.attachments.length ? (
                  <ul className="space-y-2">
                    {detail.data.attachments.map((attachment) => (
                      <SunatAttachmentControl
                        key={attachment.id}
                        companyId={companyId}
                        attachment={attachment}
                        onChanged={changed}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-600">
                    Este registro no tiene adjuntos disponibles.
                  </p>
                )}
                <details className="rounded-lg border border-slate-200 bg-white p-3">
                  <summary className="min-h-11 cursor-pointer py-2 font-medium">
                    Leer contenido del mensaje
                  </summary>
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">
                    {detail.data.message.content_text ||
                      "Sin contenido de texto disponible."}
                  </p>
                </details>
              </>
            )}
          </section>
        )}
      </QueryState>
    </SidePanel>
  );
}
