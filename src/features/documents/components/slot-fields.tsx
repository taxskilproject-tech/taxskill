import { FormField } from "@/components/molecules/form-field";
import { FormatFields } from "@/features/documents/components/format-fields";
import type { SlotFieldsProps } from "@/features/documents/types/document-ui.types";

export function SlotFields({ position, maximum, spec }: SlotFieldsProps) {
  return (
    <fieldset className="space-y-4 rounded-lg border border-zinc-200 p-4">
      <legend className="px-2 text-sm font-medium">
        Archivo requerido {position}
      </legend>
      <FormField
        defaultValue={spec?.label ?? `Archivo ${position}`}
        id={`slot-${position}`}
        label="Nombre de la posición"
        maxLength={120}
        name={`slot_label_${position}`}
        required
      />
      <FormField
        defaultValue={spec?.max_file_bytes ?? maximum}
        id={`slot-max-${position}`}
        label="Tamaño máximo en bytes"
        max={maximum}
        min={1}
        name={`slot_max_${position}`}
        required
        type="number"
      />
      <input
        name={`slot_code_${position}`}
        type="hidden"
        value={spec?.position_code ?? `file_${position}`}
      />
      <input
        name={`slot_order_${position}`}
        type="hidden"
        value={spec?.display_order ?? position}
      />
      <FormatFields
        name={`slot_formats_${position}`}
        selected={spec?.allowed_formats}
      />
    </fieldset>
  );
}
