"use client";
import type { CompanyFormProps } from "@/features/access/types/access-ui.types";
import { CompanySetupForm } from "@/features/companies/components/company-setup-form";
import { LegacyCompanyForm } from "@/features/companies/components/legacy-company-form";

export function CompanyForm(props: CompanyFormProps) {
  if (props.company && !props.company.documentary_profile)
    return <LegacyCompanyForm {...props} />;
  return <CompanySetupForm {...props} />;
}
