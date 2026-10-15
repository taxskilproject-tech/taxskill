import { parsePublicEnvironment } from "@/config/env/utils/parse-environment";

export function getPublicEnvironment() {
  // Next.js solo incorpora referencias estáticas a variables NEXT_PUBLIC.
  return parsePublicEnvironment({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
