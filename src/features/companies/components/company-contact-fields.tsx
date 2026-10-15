import { FormField } from "@/components/molecules/form-field";
import type { CompanyFieldsProps } from "@/features/companies/types/company.types";

export function CompanyContactFields({ company }: CompanyFieldsProps) {
  return (
    <>
      <FormField
        defaultValue={company?.trade_name ?? ""}
        id="trade-name"
        label="Nombre comercial"
        name="trade_name"
      />
      <FormField
        defaultValue={company?.tax_regime ?? ""}
        hint="Información declarada manualmente."
        id="tax-regime"
        label="Régimen tributario"
        name="tax_regime"
      />
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
