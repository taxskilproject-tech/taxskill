"use client";

import { useState } from "react";

import { FormField } from "@/components/molecules/form-field";
import { SectionPanel } from "@/components/organisms/section-panel";
import { formatCivilDate } from "@/domain/time/utils/civil-date";
import { CIVIL_DATE_EXAMPLE } from "@/features/setup/constants/setup";
import type { DateFieldEvent } from "@/features/setup/types/setup.types";

export function DatePreview() {
  const [value, setValue] = useState(CIVIL_DATE_EXAMPLE);
  const formatted = formatCivilDate(value);

  function updateDate(event: DateFieldEvent) {
    setValue(event.currentTarget.value);
  }

  return (
    <SectionPanel
      description="Una fecha civil conserva su día. Los momentos de las operaciones se muestran en hora de Lima."
      headingId="fecha-titulo"
      title="Fechas sin confusiones"
    >
      <FormField
        error={formatted.ok ? undefined : "Selecciona una fecha válida."}
        hint="Zona de operación: America/Lima."
        id="fecha-referencia"
        label="Fecha de referencia"
        max="9999-12-31"
        min="0001-01-01"
        onBlur={updateDate}
        onChange={updateDate}
        onInput={updateDate}
        type="date"
        value={value}
      />
      {formatted.ok && (
        <p className="text-sm text-zinc-700" role="status">
          Fecha registrada: <strong>{formatted.data}</strong>
        </p>
      )}
    </SectionPanel>
  );
}
