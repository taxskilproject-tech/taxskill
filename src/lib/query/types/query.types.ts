import type { ReactNode } from "react";

import type { ModuleId } from "@/domain/common/types/module.types";

export type CompanyScope =
  | { kind: "all" }
  | { kind: "internal" }
  | { kind: "company"; companyId: string };

export interface DataScope {
  userId: string;
  organizationId: string;
  company: CompanyScope;
  module: ModuleId | "all";
  authorization?: string;
}

export type QueryFilters = Readonly<
  Record<string, string | number | boolean | null | undefined>
>;

export type ScopedQueryKey = readonly ["scope", string, string, QueryFilters];

export interface QueryProviderProps {
  children: ReactNode;
  scope: DataScope | null;
}

export type QueryScopeContextValue = DataScope | null | undefined;
