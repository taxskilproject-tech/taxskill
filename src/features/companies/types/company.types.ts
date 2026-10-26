import type { ReactNode } from "react";

import type { Company } from "@/domain/access/types/access.types";
import type { DocumentaryModuleId } from "@/domain/common/types/module.types";

export interface CompanyFieldsProps {
  company?: Company;
  hideRegime?: boolean;
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

export interface ModuleCompanyProps {
  module: DocumentaryModuleId;
}

export interface ModuleCompanyRowsProps extends ModuleCompanyProps {
  companies: readonly Company[];
  origin: string;
}

export interface CompanyModuleProps extends ModuleCompanyProps {
  company: Company;
}
