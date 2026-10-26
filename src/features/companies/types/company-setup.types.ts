import type { RefObject } from "react";

import type { Company, Directory } from "@/domain/access/types/access.types";
import type { ChecklistSelection } from "@/domain/company-profile/types/profile.types";
import type { TemplateItem } from "@/domain/documents/types/template.types";

export interface CompanyDataFieldsProps {
  company?: Company;
  directory: Directory;
  hideRegime?: boolean;
}
export interface CompanyProfileChangesProps {
  companyId: string;
  items: TemplateItem[];
  profile: ChecklistSelection;
}
export interface CompanySetupStepProps {
  regime: string;
  onRegime: (value: string) => void;
  checklist: ChecklistSelection;
  onChecklist: (value: ChecklistSelection) => void;
}
export interface CompanySetupSummaryProps {
  company?: Company;
  items: TemplateItem[] | null;
  profile: ChecklistSelection;
  version: number | null;
  refreshing: boolean;
  onRefresh: () => void;
  form: RefObject<HTMLFormElement | null>;
}
