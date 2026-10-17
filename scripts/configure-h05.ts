import { createClient } from "@supabase/supabase-js";

import type { Database } from "../src/lib/supabase/types/database.types";
import { requireLocalTestEnvironment } from "./utils/require-local-test-environment";

const url = requireLocalTestEnvironment();
const admin = createClient<Database>(
  url,
  process.env.SUPABASE_SECRET_KEY ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);
async function main() {
  const response = await admin.rpc("h05_schedule_generation", {
    p_enabled: true,
  });
  if (response.error)
    throw new Error("No se pudo habilitar el Cron laboral local.");
  console.log(
    "Continuación laboral H05 habilitada cada minuto exclusivamente en Docker.",
  );
}
main().catch(() => {
  console.error(
    "No se completó la configuración H05 local; revisa conexión y migraciones.",
  );
  process.exitCode = 1;
});
