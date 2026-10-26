import { SelectField } from "@/components/molecules/select-field";
import { DOCUMENT_MONTHS } from "@/features/document-workspace/constants/documents";
import type { DocumentPeriodControlsProps } from "@/features/document-workspace/types/document-workspace-ui.types";

export function DocumentPeriodControls({
  navigation,
  years,
}: DocumentPeriodControlsProps) {
  return (
    <section
      aria-label="Periodo documental"
      className="grid grid-cols-2 gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-3 sm:max-w-xl"
    >
      <SelectField
        id="document-year"
        label="Año"
        value={navigation.year}
        onChange={(event) =>
          navigation.select("documentYear", event.target.value)
        }
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </SelectField>
      <SelectField
        id="document-month"
        label="Mes"
        value={navigation.month ?? ""}
        onChange={(event) =>
          navigation.select("documentMonth", event.target.value)
        }
      >
        <option value="">Seleccionar mes</option>
        {DOCUMENT_MONTHS.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </SelectField>
    </section>
  );
}
