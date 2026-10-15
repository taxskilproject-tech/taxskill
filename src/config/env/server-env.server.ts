import "server-only";

import { parseAdminEnvironment } from "@/config/env/utils/parse-admin-environment";

export function getAdminEnvironment() {
  return parseAdminEnvironment({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });
}
