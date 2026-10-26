"use client";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { SelectField } from "@/components/molecules/select-field";
import { TAX_REGIMES } from "@/domain/company-profile/constants/regimes";
import { DOCUMENT_CATALOG_TEMPLATES } from "@/domain/documents/constants/catalog-templates";
import { deliverableTemplatesSchema } from "@/domain/documents/contracts/template.schema";
import { QueryState } from "@/features/access/components/query-state";
import { useCommand } from "@/features/access/hooks/use-command";
import { TemplateWorkspace } from "@/features/deliverable-templates/components/template-workspace";
import { useDocumentQuery } from "@/features/documents/hooks/use-document-query";

export function TemplatesPanel() {
  const [regime, setRegime] = useState("");
  const query = useDocumentQuery(
    "deliverable_templates",
    {},
    deliverableTemplatesSchema,
  );
  const command = useCommand();
  const selected = query.data?.rows.find((item) => item.regime_code === regime);
  async function initialize() {
    if (
      await command.submit("InitializeDeliverableTemplates", {
        templates: DOCUMENT_CATALOG_TEMPLATES,
      })
    )
      await query.refetch();
  }
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Plantillas por régimen</h2>
      <p className="text-sm text-slate-600">
        Elige un régimen y revisa sus entregables por módulo. Publicar una
        versión la deja disponible para empresas nuevas; conserva las empresas
        ya creadas.
      </p>
      <SelectField
        id="template-regime"
        label="Régimen o categoría tributaria"
        value={regime}
        onChange={(event) => setRegime(event.target.value)}
      >
        <option value="">Seleccionar régimen</option>
        {TAX_REGIMES.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label}
          </option>
        ))}
      </SelectField>
      <QueryState
        error={query.error}
        loading={query.isPending}
        retrying={query.isFetching}
        onRetry={() => {
          void query.refetch();
        }}
      >
        {query.data?.rows.length === 0 && (
          <Button
            loading={command.busy}
            loadingText="Preparando plantillas…"
            onClick={() => {
              void initialize();
            }}
          >
            Preparar catálogo y ocho borradores
          </Button>
        )}
        {regime && !selected && Boolean(query.data?.rows.length) && (
          <p>Este régimen aún no tiene una plantilla preparada.</p>
        )}
        {selected && (
          <TemplateWorkspace
            key={selected.id}
            template={selected}
            onChanged={() => {
              void query.refetch();
            }}
          />
        )}
      </QueryState>
      {command.error && (
        <FeedbackMessage kind="error">{command.error}</FeedbackMessage>
      )}
    </section>
  );
}
