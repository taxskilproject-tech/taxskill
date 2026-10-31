import { loadEnvConfig } from "@next/env";
import { z } from "zod";

import { inspectClientBundle } from "./utils/inspect-client-bundle";

loadEnvConfig(process.cwd());
const encryptionKeys = process.env.SUNAT_CREDENTIALS_KEYS
  ? Object.values(
      z
        .record(z.string(), z.string().regex(/^[0-9a-f]{64}$/i))
        .parse(JSON.parse(process.env.SUNAT_CREDENTIALS_KEYS)),
    )
  : [];
const requiredSecrets = [
  process.env.SUPABASE_SECRET_KEY,
  process.env.IDEMPOTENCY_HMAC_KEY,
].filter((value): value is string => Boolean(value));
if (requiredSecrets.length !== 2)
  throw new Error(
    "Configura las dos claves privadas antes de verificar el bundle.",
  );
const secrets = [
  ...encryptionKeys,
  ...requiredSecrets,
  process.env.N8N_RECEIPT_TOKEN,
  process.env.N8N_WEBHOOK_TOKEN,
  process.env.H06_DISPATCH_SECRET,
  process.env.SUNAT_CREDENTIALS_KEYS,
  process.env.SUNAT_DISPATCH_SECRET,
].filter((value): value is string => Boolean(value));
const buildProfile = process.env.TAXSKILL_BUILD_PROFILE;
inspectClientBundle(
  buildProfile === "h10"
    ? ".next-h10/static"
    : buildProfile === "h09"
      ? ".next-h09/static"
      : ".next/static",
  secrets,
);
console.info(
  "Bundle del navegador verificado: sin claves administrativas, HMAC ni secretos H06 configurados.",
);
