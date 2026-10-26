"use client";
import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { DOCUMENT_CATALOG_TEMPLATES } from "@/domain/documents/constants/catalog-templates";
import { useDocumentCommand } from "@/features/documents/hooks/use-document-command";

export function ImportCatalogControl() {
  const action = useDocumentCommand();
  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5">
      <p className="text-sm text-zinc-600">
        Agregar los tipos iniciales de Tributario, Laboral general e
        ingreso/relación/cese. Conserva tus tipos existentes y sus
        modificaciones; no activa entregables ni fija vencimientos legales.
      </p>
      <Button
        loading={action.busy}
        loadingText="Agregando catálogo inicial…"
        onClick={() => {
          void action.submit("ImportDocumentCatalog", {
            templates: DOCUMENT_CATALOG_TEMPLATES,
          });
        }}
        variant="secondary"
      >
        Agregar catálogo inicial
      </Button>
      {action.error && (
        <FeedbackMessage kind="error">{action.error}</FeedbackMessage>
      )}
      {action.result && (
        <p className="text-sm text-zinc-600" role="status">
          {action.result.generated_count ?? 0} tipos agregados. Los códigos
          existentes se conservaron.
        </p>
      )}
    </section>
  );
}
