import type { OperationErrorCode } from "@/domain/common/types/operation.types";

export const OPERATION_MESSAGES: Readonly<Record<OperationErrorCode, string>> =
  {
    CONFLICT:
      "El recurso cambió. Actualiza los datos antes de volver a intentarlo.",
    DEPENDENCY_UNAVAILABLE:
      "No se pudo completar la operación. Inténtalo de nuevo.",
    FILE_TOO_LARGE: "El archivo supera el tamaño permitido.",
    FORBIDDEN: "No tienes permiso para realizar esta acción.",
    NOT_FOUND: "El recurso no está disponible.",
    UNAUTHENTICATED: "Inicia sesión para continuar.",
    VALIDATION_ERROR: "Revisa los datos indicados.",
  };

export const OPERATION_HTTP_STATUS: Readonly<
  Record<OperationErrorCode, number>
> = {
  CONFLICT: 409,
  DEPENDENCY_UNAVAILABLE: 503,
  FILE_TOO_LARGE: 413,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNAUTHENTICATED: 401,
  VALIDATION_ERROR: 422,
};

export const PROVIDER_ERROR_CODES: Readonly<
  Record<string, OperationErrorCode>
> = {
  "23505": "CONFLICT",
  "40001": "CONFLICT",
  "42501": "FORBIDDEN",
  PGRST116: "NOT_FOUND",
  PGRST301: "UNAUTHENTICATED",
  refresh_token_not_found: "UNAUTHENTICATED",
  session_not_found: "UNAUTHENTICATED",
};
