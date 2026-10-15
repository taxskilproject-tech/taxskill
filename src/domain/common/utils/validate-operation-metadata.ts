import { operationMetadataSchema } from "@/domain/common/contracts/operation-metadata.schema";
import type {
  OperationMetadata,
  OperationResult,
} from "@/domain/common/types/operation.types";
import { failure, success } from "@/domain/common/utils/operation-result";

export function validateOperationMetadata(
  value: unknown,
): OperationResult<OperationMetadata> {
  const result = operationMetadataSchema.safeParse(value);

  if (!result.success) {
    return failure("VALIDATION_ERROR");
  }

  return success(result.data);
}
