"use client";

import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { SectionPanel } from "@/components/organisms/section-panel";
import { formatLimaDateTime } from "@/domain/time/utils/instant";
import { useConnectionCheck } from "@/features/setup/hooks/use-connection-check";

export function ConnectionPanel() {
  const { checkConnection, configuration, pending, result } =
    useConnectionCheck();
  const checkedAt = result?.ok
    ? formatLimaDateTime(result.data.checkedAt)
    : null;

  return (
    <SectionPanel
      description="Comprueba la disponibilidad del servicio antes de iniciar el trabajo."
      headingId="conexion-titulo"
      title="Conexión del entorno"
    >
      {!configuration.ok && (
        <FeedbackMessage kind="error">
          {configuration.error.field_errors?.configuration?.[0] ??
            configuration.error.message}
        </FeedbackMessage>
      )}
      {configuration.ok && !result && !pending && (
        <p className="text-sm text-zinc-600">
          Configuración pública disponible.
        </p>
      )}
      <div>
        <Button
          disabled={!configuration.ok}
          loading={pending}
          loadingText="Comprobando conexión…"
          onClick={checkConnection}
        >
          Comprobar conexión
        </Button>
      </div>
      {result && !result.ok && (
        <FeedbackMessage kind="error">{result.error.message}</FeedbackMessage>
      )}
      {checkedAt?.ok && (
        <FeedbackMessage kind="success">
          Conexión disponible. Verificado el {checkedAt.data} (Lima).
        </FeedbackMessage>
      )}
    </SectionPanel>
  );
}
