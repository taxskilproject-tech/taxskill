import { z } from "zod";

import type { OperationResult } from "@/domain/common/types/operation.types";
import { normalizeOperationError } from "@/domain/common/utils/normalize-operation-error";
import { failure, success } from "@/domain/common/utils/operation-result";

export function decodeRpc<T>(
  data: unknown,
  error: unknown,
  schema: z.ZodType<T>,
): OperationResult<T> {
  if (error) return failure(normalizeOperationError(error));
  const envelope = z
    .discriminatedUnion("ok", [
      z.object({ ok: z.literal(true), data: schema }),
      z.object({ ok: z.literal(false), error: z.object({ code: z.string() }) }),
    ])
    .safeParse(data);
  if (!envelope.success) return failure(normalizeOperationError(null));
  return envelope.data.ok
    ? success(envelope.data.data)
    : failure(normalizeOperationError(envelope.data.error));
}
