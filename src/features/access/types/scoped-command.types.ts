import type { OperationResult } from "@/domain/common/types/operation.types";

export type ScopedCommandExecutor<Operation extends string, Result> = (
  organizationId: string,
  requestId: string,
  operation: Operation,
  input: Record<string, unknown>,
) => Promise<OperationResult<Result>>;
