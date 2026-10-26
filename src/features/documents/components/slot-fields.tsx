import { FormField } from "@/components/molecules/form-field";
import { FileSizeField } from "@/features/documents/components/file-size-field";
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
        label="Nombre del archivo requerido"
        maxLength={120}
        name={`slot_label_${position}`}
        required
      />
      <FileSizeField
        defaultValue={spec?.max_file_bytes ?? maximum}
        id={`slot-max-${position}`}
        label="Tamaño máximo"
        maximum={maximum}
        name={`slot_max_${position}`}
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
