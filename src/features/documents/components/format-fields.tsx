import { CheckboxField } from "@/components/molecules/checkbox-field";
import { FILE_FORMATS } from "@/domain/documents/constants/documents";
import type { FormatFieldsProps } from "@/features/documents/types/document-ui.types";

export function FormatFields({
  name,
  selected = ["pdf"],
  disabled = false,
}: FormatFieldsProps) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium">Formatos permitidos</legend>
      <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-4">
        {FILE_FORMATS.map((format) => (
          <CheckboxField
            defaultChecked={selected.includes(format)}
            id={`${name}-${format}`}
            key={format}
            label={format.toUpperCase()}
            name={name}
            value={format}
          />
        ))}
      </div>
    </fieldset>
  );
}
