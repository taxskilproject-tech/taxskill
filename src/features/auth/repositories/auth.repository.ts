import { sessionContextSchema } from "@/features/auth/contracts/session.schema";
import type { AppSupabaseClient } from "@/lib/supabase/types/client.types";
import { decodeRpc } from "@/lib/supabase/utils/decode-rpc";

export async function loadSessionContext(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("h02_context");
  return decodeRpc(data, error, sessionContextSchema);
}
