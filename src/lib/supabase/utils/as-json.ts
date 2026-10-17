import { z } from "zod";

import type { Json } from "@/lib/supabase/types/database.types";

export function asJson(value: unknown): Json {
  return z.json().parse(JSON.parse(JSON.stringify(value)));
}
