import { adminEnvironmentSchema } from "@/config/env/schemas/admin-environment.schema";
import type {
  AdminEnvironment,
  AdminEnvironmentSource,
} from "@/config/env/types/environment.types";
import type { OperationResult } from "@/domain/common/types/operation.types";
import { failure, success } from "@/domain/common/utils/operation-result";

export function parseAdminEnvironment(
  source: AdminEnvironmentSource,
): OperationResult<AdminEnvironment> {
  const result = adminEnvironmentSchema.safeParse(source);

  if (!result.success) {
    return failure("VALIDATION_ERROR", {
      configuration: [
        "La configuración administrativa de servidor no está lista.",
      ],
    });
  }

  return success({
    supabaseUrl: result.data.NEXT_PUBLIC_SUPABASE_URL,
    secretKey: result.data.SUPABASE_SECRET_KEY,
  });
}
