import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../../src/lib/supabase/types/database.types.ts";

export interface DispatchEnvironment { appBaseUrl: string; webhookUrl: string; webhookToken: string; }
export type DispatchClient = SupabaseClient<Database>;
export type DispatchPageResult = Awaited<ReturnType<DispatchClient["rpc"]>>;
