import { OPERATION_MESSAGES } from "@/domain/common/constants/operation-errors";
import type {
  OperationError,
  OperationErrorCode,
  OperationResult,
} from "@/domain/common/types/operation.types";

export function success<T>(data: T): OperationResult<T> {
  return { ok: true, data };
}

export function failure(
  code: OperationErrorCode | OperationError,
  fieldErrors?: OperationError["field_errors"],
): OperationResult<never> {
  return {
    ok: false,
    error:
      typeof code === "string"
        ? {
            code,
            message: OPERATION_MESSAGES[code],
            ...(fieldErrors ? { field_errors: fieldErrors } : {}),
          }
        : code,
  };
}
