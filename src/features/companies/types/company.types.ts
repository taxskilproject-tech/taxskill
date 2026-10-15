import type { Company } from "@/domain/access/types/access.types";

export interface CompanyFieldsProps {
  company?: Company;
}

export interface CompanyDetailProps {
  companyId: string;
}
