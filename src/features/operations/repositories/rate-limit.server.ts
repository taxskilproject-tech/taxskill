import { createHash } from "node:crypto";
import "server-only";

import { RATE_LIMITS } from "@/features/operations/constants/operations";
import type { RateLimitBucket } from "@/features/operations/types/operations.types";
import type { AppSupabaseClient } from "@/lib/supabase/types/client.types";

export async function enforceRateLimit(
  client: AppSupabaseClient,
  bucket: RateLimitBucket,
  identity: string,
) {
  const configuration = RATE_LIMITS[bucket];
  const result = await client.rpc("h08_consume_rate_limit", {
    p_bucket: bucket,
    p_key_hash: createHash("sha256").update(identity).digest("hex"),
    p_limit: configuration.limit,
    p_seconds: configuration.windowSeconds,
  });
  if (result.error) throw { code: "DEPENDENCY_UNAVAILABLE" };
  if (result.data !== true) throw { code: "RATE_LIMITED" };
}
