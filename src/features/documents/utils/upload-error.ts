import type { OperationError } from "@/domain/common/types/operation.types";
import {
  isRecord,
  normalizeOperationError,
} from "@/domain/common/utils/normalize-operation-error";
import type { StorageTransferError } from "@/domain/documents/types/document.types";

function isStorageTransferError(value: unknown): value is StorageTransferError {
  return (
    isRecord(value) &&
    isRecord(value.originalResponse) &&
    typeof value.originalResponse.getStatus === "function"
  );
}
export function normalizeUploadError(cause: unknown): OperationError {
  if (!isStorageTransferError(cause)) return normalizeOperationError(cause);
  const status = cause.originalResponse.getStatus();
  if (status === 413)
    return normalizeOperationError({ code: "STORAGE_LIMIT_INCOMPATIBLE" });
  if (status === 409) return normalizeOperationError({ code: "CONFLICT" });
  if (status === 403) return normalizeOperationError({ code: "FORBIDDEN" });
  return normalizeOperationError(cause);
}
