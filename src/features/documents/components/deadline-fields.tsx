import { useState } from "react";

import { FormField } from "@/components/molecules/form-field";
import { SelectField } from "@/components/molecules/select-field";
import type { DeadlineFieldsProps } from "@/features/documents/types/engine-ui.types";

export function DeadlineFields({
  initial,
  eventual,
  allowIncomplete,
}: DeadlineFieldsProps) {
  const [mode, setMode] = useState(
    initial === 0
      ? "close"
      : initial != null && initial < 0
        ? "before"
        : "after",
  );
  const [days, setDays] = useState(
    initial == null ? "" : String(Math.abs(initial)),
  );
  const value =
    mode === "close"
      ? "0"
      : days
        ? String(Number(days) * (mode === "before" ? -1 : 1))
        : "";
  return (
    <div className="space-y-3">
      <SelectField
        id="deadline-mode"
        label={eventual ? "Plazo desde el evento" : "Cuándo vence cada periodo"}
        value={mode}
        onChange={(event) => setMode(event.target.value)}
      >
        <option value="close">
          {eventual ? "El día del evento" : "Al cierre del periodo"}
        </option>
        <option value="after">Días después</option>
        <option value="before">Días antes</option>
      </SelectField>
      {mode !== "close" && (
        <FormField
          id="deadline-days"
          label="Cantidad de días calendario"
          type="number"
          min={1}
          max={366}
          value={days}
          required={!allowIncomplete}
          onChange={(event) => setDays(event.target.value)}
        />
      )}
      <input type="hidden" name="deadline_offset_days" value={value} />
      <p className="text-xs text-slate-600">
        {eventual
          ? "Se cuenta desde la fecha del evento."
          : "Se cuenta desde el último día del periodo, no desde la fecha en que comienza a solicitarse."}
      </p>
    </div>
  );
}
