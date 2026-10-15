export type OperationErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "FILE_TOO_LARGE"
  | "DEPENDENCY_UNAVAILABLE";

export interface OperationError {
  code: OperationErrorCode;
  message: string;
  field_errors?: Readonly<Record<string, readonly string[]>>;
}

export type OperationResult<T> =
  { ok: true; data: T } | { ok: false; error: OperationError };

export interface OperationMetadata {
  request_id: string;
  expected_revision?: number;
}

export type UnknownRecord = Record<string, unknown>;
