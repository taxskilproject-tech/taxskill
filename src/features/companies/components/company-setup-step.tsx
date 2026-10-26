import { SelectField } from "@/components/molecules/select-field";
import { TAX_REGIMES } from "@/domain/company-profile/constants/regimes";
import type { CompanySetupStepProps } from "@/features/companies/types/company-setup.types";
import { CompanyChecklist } from "@/features/deliverable-templates/components/company-checklist";

export function CompanySetupStep({
  regime,
  onRegime,
  checklist,
  onChecklist,
}: CompanySetupStepProps) {
  return (
    <div className="space-y-4">
      <SelectField
        id="company-tax-regime"
        name="tax_regime_code"
        label="Régimen o categoría tributaria"
        value={regime}
        required
        onChange={(event) => onRegime(event.target.value)}
      >
        <option value="">Seleccionar régimen</option>
        {TAX_REGIMES.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label}
          </option>
        ))}
      </SelectField>
      <CompanyChecklist value={checklist} onChange={onChecklist} />
    </div>
  );
}
