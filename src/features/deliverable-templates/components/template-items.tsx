import { useState } from "react";

import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { SectionNavigation } from "@/components/molecules/section-navigation";
import { SelectField } from "@/components/molecules/select-field";
import { APPLICABILITY_LABELS } from "@/domain/company-profile/constants/regimes";
import {
  FREQUENCY_LABELS,
  MODULE_LABELS,
} from "@/domain/documents/constants/engine";
import type { TemplateItemsProps } from "@/features/deliverable-templates/types/template-ui.types";
import { deadlineDescription } from "@/features/deliverable-templates/utils/template-presentation";

export function TemplateItems({ items, issues, onEdit }: TemplateItemsProps) {
  const [module, setModule] = useState("tributario");
  const [stage, setStage] = useState("ingreso");
  const visible = items
    .filter(
      (item) =>
        item.module === module &&
        (module !== "laboral_trabajador" || item.stage === stage),
    )
    .toSorted((a, b) => a.position - b.position);
  const included = visible.filter((item) => item.included);
  const incomplete = included.filter((item) =>
    issues.some((issue) => issue.code === item.code),
  );
  return (
    <div className="space-y-3">
      {issues.some((issue) =>
        items.some((item) => item.code === issue.code),
      ) && (
        <SelectField
          id="template-missing"
          label="Completar un entregable pendiente"
          value=""
          onChange={(event) => {
            const pending = items.find(
              (item) => item.code === event.target.value,
            );
            if (pending) onEdit(pending);
          }}
        >
          <option value="">Seleccionar pendiente de cualquier módulo</option>
          {issues.map((issue) => {
            const pending = items.find((item) => item.code === issue.code);
            return pending ? (
              <option key={issue.code} value={issue.code}>
                {pending.name} · {issue.message}
              </option>
            ) : null;
          })}
        </SelectField>
      )}
      <SectionNavigation
        label="Módulo de la plantilla"
        selected={module}
        onSelect={setModule}
        items={["tributario", "laboral_general", "laboral_trabajador"].map(
          (id) => ({
            id,
            label:
              id === "tributario"
                ? MODULE_LABELS.tributario
                : id === "laboral_general"
                  ? MODULE_LABELS.laboral_general
                  : MODULE_LABELS.laboral_trabajador,
          }),
        )}
      />
      {module === "laboral_trabajador" && (
        <SelectField
          id="template-stage"
          label="Etapa documental"
          value={stage}
          onChange={(event) => setStage(event.target.value)}
        >
          <option value="ingreso">Ingreso</option>
          <option value="relacion">Relación laboral</option>
          <option value="cese">Cese</option>
        </SelectField>
      )}
      <p className="text-sm" role="status">
        {included.length} incluidos · {included.length - incomplete.length}{" "}
        listos · {incomplete.length} por configurar
      </p>
      <div className="space-y-1">
        {visible.map((item) => {
          const issue = issues.find((value) => value.code === item.code);
          const ordinal =
            included.findIndex((value) => value.code === item.code) + 1;
          return (
            <article
              key={item.code}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="min-w-0 space-y-1">
                <h3 className="text-sm font-semibold">
                  {ordinal > 0 ? String(ordinal).padStart(2, "0") : "—"} ·{" "}
                  {item.name}
                </h3>
                <p className="text-xs text-slate-600">
                  {APPLICABILITY_LABELS[item.condition]} ·{" "}
                  {item.configuration.deliverable_specs.length} archivos
                </p>
                <p className="text-xs text-slate-600">
                  {item.configuration.frequency
                    ? FREQUENCY_LABELS[item.configuration.frequency]
                    : "Periodicidad por configurar"}{" "}
                  ·{" "}
                  {deadlineDescription(item.configuration.deadline_offset_days)}
                </p>
                {item.included && issue && (
                  <p className="text-xs text-amber-800">{issue.message}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge
                  tone={
                    !item.included ? "neutral" : issue ? "warning" : "success"
                  }
                >
                  {!item.included
                    ? "Excluido"
                    : issue
                      ? "Por configurar"
                      : "Listo"}
                </Badge>
                <Button variant="secondary" onClick={() => onEdit(item)}>
                  Configurar
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
