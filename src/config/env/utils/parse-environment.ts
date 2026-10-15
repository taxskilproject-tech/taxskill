import { publicEnvironmentSchema } from "@/config/env/schemas/environment.schema";
import type {
  PublicEnvironment,
  PublicEnvironmentSource,
} from "@/config/env/types/environment.types";
import type { OperationResult } from "@/domain/common/types/operation.types";
import { failure, success } from "@/domain/common/utils/operation-result";

export function parsePublicEnvironment(
  source: PublicEnvironmentSource,
): OperationResult<PublicEnvironment> {
  const result = publicEnvironmentSchema.safeParse(source);

  if (!result.success) {
    return failure("VALIDATION_ERROR", {
      configuration: [
        "Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local.",
      ],
    });
  }

  return success({
    supabaseUrl: result.data.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: result.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
