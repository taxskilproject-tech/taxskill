import type { ReactNode } from "react";
import type { z } from "zod";

import type { DocumentaryModuleId } from "@/domain/common/types/module.types";
import type {
  OperationError,
  OperationResult,
} from "@/domain/common/types/operation.types";
import type { sessionContextSchema } from "@/features/auth/contracts/session.schema";
import type { CompanyScope } from "@/lib/query/types/query.types";

export type SessionContext = z.infer<typeof sessionContextSchema>;
export interface AuthState {
  status: "loading" | "anonymous" | "ready" | "blocked";
  context: SessionContext | null;
  error: OperationError | null;
}
export interface AuthController extends AuthState {
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<OperationResult<null>>;
  logout: () => Promise<OperationResult<null>>;
}
export interface AuthProviderProps {
  children: ReactNode;
}
export interface ProtectedWorkspaceProps {
  children: ReactNode;
}
export interface WorkspaceContextValue {
  context: SessionContext;
  company: CompanyScope;
  selectCompany: (value: string) => void;
}
export interface ShellProps extends ProtectedWorkspaceProps {
  documentaryModule?: DocumentaryModuleId | null;
  context: SessionContext;
  company: CompanyScope;
  onSelectCompany: (value: string) => void;
  onLogout: () => void;
  loggingOut: boolean;
  error?: string;
}
export interface UserRouteContext {
  params: Promise<{ userId: string }>;
}
export interface CompanyPageProps {
  params: Promise<{ companyId: string }>;
}
