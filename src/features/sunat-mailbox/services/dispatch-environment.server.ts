import "server-only";

import { sunatDispatcherEnvironmentSchema } from "@/features/sunat-mailbox/contracts/dispatch.schema";
import { parseSunatKeyring } from "@/features/sunat-mailbox/services/credentials-crypto.server";

export function getSunatDispatcherEnvironment() {
  const result = sunatDispatcherEnvironmentSchema.safeParse(process.env);
  if (!result.success) throw { code: "DEPENDENCY_UNAVAILABLE" };
  parseSunatKeyring(
    result.data.SUNAT_CREDENTIALS_CURRENT_KEY,
    result.data.SUNAT_CREDENTIALS_KEYS,
  );
  return result.data;
}

export function usesLocalSunatWorker(): boolean {
  if (process.env.SUNAT_EXECUTION_MODE === "vercel") return false;
  return (
    process.env.VERCEL !== "1" &&
    /^http:\/\/127\.0\.0\.1:54431$/.test(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    )
  );
}
