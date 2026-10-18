import type { PostgrestSingleResponse } from "@supabase/supabase-js";

export type ScriptQueryResult<T> = PostgrestSingleResponse<T>;
