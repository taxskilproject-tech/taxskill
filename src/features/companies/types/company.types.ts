import type { ReactNode } from "react";

import type { Company } from "@/domain/access/types/access.types";

export interface CompanyFieldsProps {
  company?: Company;
}

export interface CompanyDetailProps {
  companyId: string;
}
export interface CompanyTabsProps extends CompanyDetailProps {
  summary?: ReactNode;
  administration?: ReactNode;
}
export interface CompanyOverviewProps {
  company: Company;
}
