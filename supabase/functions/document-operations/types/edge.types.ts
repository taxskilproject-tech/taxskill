import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { bodySchema, uploadContextSchema } from "../contracts.ts";

export type EdgeBody = z.infer<typeof bodySchema>;
export type UploadContext = z.infer<typeof uploadContextSchema>;
export interface EdgeContext { user: SupabaseClient; admin: SupabaseClient; actorId: string; sessionId: string }
