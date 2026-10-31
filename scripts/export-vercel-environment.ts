import { z } from "zod";

import { adminEnvironmentSchema } from "../src/config/env/schemas/admin-environment.schema";
import { isPublishableKey } from "../src/config/env/utils/validate-public-key";
import { sunatDispatcherEnvironmentSchema } from "../src/features/sunat-mailbox/contracts/dispatch.schema";
import {
  CLOUD_APPLICATION_ENV_FILE,
  CLOUD_EDGE_ENV_FILE,
  VERCEL_ENV_FILE,
} from "./constants/environment-files";
import {
  readEnvironmentFile,
  saveEnvironmentFile,
} from "./utils/environment-file";

function main() {
  const application = readEnvironmentFile(CLOUD_APPLICATION_ENV_FILE);
  const edge = readEnvironmentFile(CLOUD_EDGE_ENV_FILE);
  const url = "https://gzwrqvqofcrdjvzoblaz.supabase.co";
  if (
    application.NEXT_PUBLIC_SUPABASE_URL !== url ||
    !isPublishableKey(application.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  )
    throw new Error(
      "Completa la configuración Cloud del proyecto real antes de exportar Vercel.",
    );
  if (!adminEnvironmentSchema.safeParse(application).success)
    throw new Error("Falta una credencial administrativa Cloud válida.");
  const hmac = z
    .string()
    .regex(/^[a-f0-9]{64}$/i)
    .safeParse(application.IDEMPOTENCY_HMAC_KEY);
  const receipt = z.string().min(32).safeParse(edge.N8N_RECEIPT_TOKEN);
  if (!hmac.success || !receipt.success)
    throw new Error(
      "Faltan HMAC o token de receipts; conserva las claves operativas existentes.",
    );
  const sunat =
    application.SUNAT_EXECUTION_MODE === "vercel"
      ? sunatDispatcherEnvironmentSchema.parse(application)
      : {};
  if (
    application.SUNAT_EXECUTION_MODE === "vercel" &&
    (!/^[a-f0-9]{64}$/.test(application.SUNAT_DISPATCH_SECRET ?? "") ||
      !["true", "false"].includes(application.SUNAT_DAILY_ENABLED ?? ""))
  )
    throw new Error(
      "Completa el secreto y la configuración diaria de SUNAT antes de exportar.",
    );
  saveEnvironmentFile(VERCEL_ENV_FILE, {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      application.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: application.SUPABASE_SECRET_KEY,
    IDEMPOTENCY_HMAC_KEY: hmac.data,
    APP_BASE_URL: "https://taxskill.vercel.app",
    N8N_RECEIPT_TOKEN: receipt.data,
    ...sunat,
    ...(application.SUNAT_EXECUTION_MODE === "vercel"
      ? {
          SUNAT_DISPATCH_SECRET: application.SUNAT_DISPATCH_SECRET,
          SUNAT_DAILY_ENABLED: application.SUNAT_DAILY_ENABLED,
        }
      : {}),
  });
  console.info(
    ".env.vercel listo: configuración de la aplicación real, sin credenciales Docker ni secretos Edge/n8n de salida.",
  );
}
try {
  main();
} catch (cause) {
  console.error(
    cause instanceof Error ? cause.message : "No se pudo preparar Vercel.",
  );
  process.exitCode = 1;
}
