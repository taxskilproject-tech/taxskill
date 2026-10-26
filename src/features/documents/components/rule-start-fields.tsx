import { z } from "zod";

import { FormField } from "@/components/molecules/form-field";
import { QueryState } from "@/features/access/components/query-state";
import { useDocumentQuery } from "@/features/documents/hooks/use-document-query";
import type { RuleStartFieldsProps } from "@/features/documents/types/engine-ui.types";

const startSchema = z.object({
  minimum: z.string(),
  frequency: z.string().nullable(),
  today: z.string(),
});
export function RuleStartFields({ rule, companyId }: RuleStartFieldsProps) {
  const enabled = Boolean(rule || companyId);
  const query = useDocumentQuery(
    "rule_start",
    { id: rule?.id, company_id: rule?.company_id ?? companyId },
    startSchema,
    enabled,
  );
  if (!enabled)
    return (
      <p className="text-sm">
        Selecciona una empresa para definir cuándo empieza a solicitarse.
      </p>
    );
  return (
    <QueryState
      loading={query.isPending}
      error={query.error}
      retrying={query.isFetching}
      onRetry={() => {
        void query.refetch();
      }}
    >
      {query.data && (
        <FormField
          key={`${rule?.id ?? companyId}:${query.data.minimum}`}
          id="rule-start"
          label={rule ? "Aplicar cambios desde" : "Empezar a solicitar desde"}
          type="date"
          name={rule ? "effective_from" : "control_start_date"}
          defaultValue={query.data.minimum}
          min={query.data.minimum}
          required
          hint={
            rule
              ? "Se muestra el próximo periodo permitido. Puedes elegir un inicio de periodo posterior; lo ya emitido conserva sus condiciones."
              : "La fecha se interpreta en Lima. El primer periodo será el que contenga esta fecha; no se generan periodos anteriores."
          }
        />
      )}
    </QueryState>
  );
}
