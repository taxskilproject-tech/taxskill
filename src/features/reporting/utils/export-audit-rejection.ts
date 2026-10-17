import { OPERATION_MESSAGES } from "@/domain/common/constants/operation-errors";
import type { OperationErrorCode } from "@/domain/common/types/operation.types";

export class ExportAuditRejection extends Error {
  constructor(readonly code: OperationErrorCode) {
    super(
      code === "CONFLICT"
        ? "Los datos o permisos cambiaron. Actualiza el reporte y vuelve a exportar."
        : OPERATION_MESSAGES[code],
    );
    this.name = "ExportAuditRejection";
  }
}
