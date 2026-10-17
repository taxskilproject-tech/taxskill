"use client";
import { useState } from "react";

import { CheckboxField } from "@/components/molecules/checkbox-field";
import { SelectField } from "@/components/molecules/select-field";
import type { RuleConditionsProps } from "@/features/documents/types/engine-ui.types";

const EVENTS = [
  {
    value: "manual_request",
    label: "Solicitud identificada del administrador",
  },
  { value: "worker_hired", label: "Ingreso o reingreso de una etapa laboral" },
  { value: "worker_terminated", label: "Cese de una etapa laboral" },
];
const REASONS = [
  { value: "renuncia", label: "Renuncia" },
  { value: "despido", label: "Despido" },
  { value: "fin_contrato", label: "Fin de contrato" },
  { value: "mutuo_acuerdo", label: "Mutuo acuerdo" },
  { value: "otro", label: "Otro" },
];
export function RuleConditionsFields({
  frequency,
  module,
  configuration,
}: RuleConditionsProps) {
  const conditions = configuration?.applicability_conditions;
  const [stage, setStage] = useState<string>(
    conditions?.employment_stage ?? "any",
  );
  const worker = module === "laboral_trabajador";
  const defaultEvents =
    stage === "cese"
      ? ["worker_terminated"]
      : stage === "ingreso"
        ? ["worker_hired"]
        : ["manual_request"];
  const selectedEvents =
    stage === (conditions?.employment_stage ?? "any") &&
    conditions?.event_types.length
      ? conditions.event_types
      : defaultEvents;
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold">Aplicabilidad</legend>
      {worker ? (
        <>
          <SelectField
            id="rule-stage"
            label="Etapa laboral"
            name="employment_stage"
            onChange={(event) => setStage(event.target.value)}
            value={stage}
          >
            <option value="any">Cualquier etapa elegible</option>
            <option value="relacion">Relación laboral</option>
            <option value="ingreso">
              Ingreso / reingreso, mediante evento
            </option>
            <option value="cese">Cese, mediante evento</option>
          </SelectField>
          <p className="text-sm text-zinc-600">
            La regla se expande a cada etapa laboral elegible de la empresa. El
            expediente y sus operaciones se completan en H05.
          </p>
        </>
      ) : (
        <input name="employment_stage" type="hidden" value="any" />
      )}
      {frequency === "eventual" && (
        <div className="space-y-2" key={stage}>
          <p className="text-sm text-zinc-600">
            Selecciona el evento que inicia la obligación; Cron no inventa
            eventos.
          </p>
          {EVENTS.filter(
            (event) => worker || event.value === "manual_request",
          ).map((event) => (
            <CheckboxField
              defaultChecked={selectedEvents.includes(event.value)}
              id={`event-${event.value}`}
              key={event.value}
              label={event.label}
              name="event_types"
              value={event.value}
            />
          ))}
        </div>
      )}
      {worker && stage === "cese" && (
        <div className="space-y-2">
          <p className="text-sm text-zinc-600">
            Motivos admitidos. Sin selección: todos. Un motivo distinto registra
            No aplica con explicación.
          </p>
          {REASONS.map((reason) => (
            <CheckboxField
              defaultChecked={conditions?.termination_reasons.some(
                (value) => value === reason.value,
              )}
              id={`reason-${reason.value}`}
              key={reason.value}
              label={reason.label}
              name="termination_reasons"
              value={reason.value}
            />
          ))}
        </div>
      )}
    </fieldset>
  );
}
