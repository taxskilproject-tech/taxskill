import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types/database.types";

export type AppSupabaseClient = SupabaseClient<Database>;
