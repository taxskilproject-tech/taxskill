import { createClient } from "@supabase/supabase-js";

import type { Database } from "../src/lib/supabase/types/database.types";
import { requireLocalTestEnvironment } from "./utils/require-local-test-environment";

const url = requireLocalTestEnvironment();
const admin = createClient<Database>(
  url,
  process.env.SUPABASE_SECRET_KEY ?? "",
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

async function main() {
  const response = await admin.rpc("h04_schedule_generation", {
    p_enabled: true,
  });
  if (response.error) throw new Error("No se pudo activar Cron H04 local.");
  console.log(
    "Cron H04 habilitado exclusivamente en Docker: 00:05 de Lima y continuación cada minuto.",
  );
}

main().catch(() => {
  console.error(
    "H04 local: revisa las migraciones y la conexión administrativa.",
  );
  process.exitCode = 1;
});
