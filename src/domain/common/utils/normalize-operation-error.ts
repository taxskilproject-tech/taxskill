import {
  OPERATION_HTTP_STATUS,
  OPERATION_MESSAGES,
  PROVIDER_ERROR_CODES,
} from "@/domain/common/constants/operation-errors";
import type {
  OperationError,
  OperationErrorCode,
  UnknownRecord,
} from "@/domain/common/types/operation.types";

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isErrorCode(value: string): value is OperationErrorCode {
  return Object.hasOwn(OPERATION_MESSAGES, value);
}

export function normalizeOperationError(value: unknown): OperationError {
  const sourceCode = isRecord(value) ? value.code : undefined;

  if (typeof sourceCode !== "string") {
    return {
      code: "DEPENDENCY_UNAVAILABLE",
      message: OPERATION_MESSAGES.DEPENDENCY_UNAVAILABLE,
    };
  }

  const code = isErrorCode(sourceCode)
    ? sourceCode
    : (PROVIDER_ERROR_CODES[sourceCode] ?? "DEPENDENCY_UNAVAILABLE");

  return { code, message: OPERATION_MESSAGES[code] };
}

// Esta equivalencia pertenece a Route Handlers; no presupone el HTTP de Data API.
export function getOperationHttpStatus(code: OperationErrorCode): number {
  return OPERATION_HTTP_STATUS[code];
}
