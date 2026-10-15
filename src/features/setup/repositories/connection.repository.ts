import { getPublicEnvironment } from "@/config/env/public-env";
import type { OperationResult } from "@/domain/common/types/operation.types";
import { failure, success } from "@/domain/common/utils/operation-result";
import {
  AUTH_HEALTH_PATH,
  CONNECTION_TIMEOUT_MS,
} from "@/features/setup/constants/setup";
import type { ConnectionCheck } from "@/features/setup/types/setup.types";

export async function checkSupabaseConnection(
  signal: AbortSignal,
): Promise<OperationResult<ConnectionCheck>> {
  const environment = getPublicEnvironment();
  if (!environment.ok) return environment;

  try {
    // Health es público y no tiene operación SDK: no consulta datos del negocio.
    const response = await fetch(
      new URL(AUTH_HEALTH_PATH, environment.data.supabaseUrl),
      {
        cache: "no-store",
        headers: { apikey: environment.data.publishableKey },
        signal: AbortSignal.any([
          signal,
          AbortSignal.timeout(CONNECTION_TIMEOUT_MS),
        ]),
      },
    );

    if (!response.ok) return failure("DEPENDENCY_UNAVAILABLE");

    return success({ checkedAt: new Date().toISOString() });
  } catch {
    return failure("DEPENDENCY_UNAVAILABLE");
  }
}
