import { FormField } from "@/components/molecules/form-field";
import { SelectField } from "@/components/molecules/select-field";
import { TAX_REGIMES } from "@/domain/company-profile/constants/regimes";
import type { CompanyFieldsProps } from "@/features/companies/types/company.types";

export function CompanyContactFields({
  company,
  hideRegime,
}: CompanyFieldsProps) {
  const retainedRegime =
    company?.tax_regime &&
    !TAX_REGIMES.some((item) => item.label === company.tax_regime)
      ? company.tax_regime
      : null;
  return (
    <>
      <FormField
        defaultValue={company?.trade_name ?? ""}
        id="trade-name"
        label="Nombre comercial"
        name="trade_name"
      />
      {!hideRegime && (
        <SelectField
          defaultValue={company?.tax_regime ?? ""}
          id="tax-regime"
          label="Régimen o categoría tributaria"
          name="tax_regime"
        >
          <option value="">Seleccionar régimen</option>
          {retainedRegime && (
            <option value={retainedRegime}>
              Conservar registro anterior: {retainedRegime}
            </option>
          )}
          {TAX_REGIMES.map((item) => (
            <option key={item.code} value={item.label}>
              {item.label}
            </option>
          ))}
        </SelectField>
      )}
      <FormField
        defaultValue={company?.contact_email ?? ""}
        id="contact-email"
        label="Correo de contacto"
        name="contact_email"
        type="email"
      />
      <FormField
        defaultValue={company?.contact_phone ?? ""}
        id="contact-phone"
        label="Teléfono"
        name="contact_phone"
        type="tel"
      />
      <FormField
        defaultValue={company?.address ?? ""}
        id="address"
        label="Dirección"
        name="address"
      />
      <FormField
        defaultValue={company?.legal_representative ?? ""}
        id="representative"
        label="Representante legal"
        name="legal_representative"
      />
    </>
  );
}
