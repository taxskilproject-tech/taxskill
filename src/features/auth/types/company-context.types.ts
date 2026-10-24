import type { DocumentaryModuleId } from "@/domain/common/types/module.types";

export interface WorkspaceRoute {
  companyId: string | null;
  module: DocumentaryModuleId | null;
  picker: boolean;
}

export interface RememberedCompany {
  identity: string;
  route: string;
  selection: string;
}
