import { z } from "zod";

import { isPublishableKey } from "@/config/env/utils/validate-public-key";

export const supabaseUrlSchema = z.url().refine((value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  const localHosts = ["localhost", "127.0.0.1", "[::1]"];

  return (
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash &&
    url.pathname === "/" &&
    (url.protocol === "https:" ||
      (url.protocol === "http:" && localHosts.includes(url.hostname)))
  );
}, "Usa una URL HTTPS de Supabase o una URL local de desarrollo.");

export const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrlSchema,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().refine(isPublishableKey),
});
