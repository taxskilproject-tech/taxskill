import { loadEnvConfig } from "@next/env";

import { inspectClientBundle } from "./utils/inspect-client-bundle";

loadEnvConfig(process.cwd());
const requiredSecrets = [
  process.env.SUPABASE_SECRET_KEY,
  process.env.IDEMPOTENCY_HMAC_KEY,
].filter((value): value is string => Boolean(value));
if (requiredSecrets.length !== 2)
  throw new Error(
    "Configura las dos claves privadas antes de verificar el bundle.",
  );
const secrets = [
  ...requiredSecrets,
  process.env.N8N_RECEIPT_TOKEN,
  process.env.N8N_WEBHOOK_TOKEN,
  process.env.H06_DISPATCH_SECRET,
].filter((value): value is string => Boolean(value));
inspectClientBundle(process.env.TAXSKILL_BUILD_PROFILE === "h09" ? ".next-h09/static" : ".next/static", secrets);
console.info(
  "Bundle del navegador verificado: sin claves administrativas, HMAC ni secretos H06 configurados.",
);
