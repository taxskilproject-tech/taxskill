import { loadEnvConfig } from "@next/env";

import { isLocalSupabaseUrl } from "../../src/config/env/utils/is-local-supabase-url";

export function requireLocalTestEnvironment(): string {
  loadEnvConfig(process.cwd());
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!isLocalSupabaseUrl(url) || !url)
    throw new Error(
      "Pruebas y datos ficticios bloqueados: se requiere Supabase local de TaxSkill en Docker (puerto 54331). Ejecuta yarn db:local:start y yarn env:local. No se permiten destinos Cloud.",
    );
  return url;
}
