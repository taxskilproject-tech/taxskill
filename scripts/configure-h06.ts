import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

import {
  LOCAL_EDGE_ENV_FILE,
  LOCAL_N8N_ENV_FILE,
} from "./constants/environment-files";
import { ensureEnvironmentDirectory } from "./utils/environment-file";
import { requireLocalTestEnvironment } from "./utils/require-local-test-environment";

loadEnvConfig(process.cwd());
requireLocalTestEnvironment();
if (process.argv.slice(2).some((argument) => argument !== "--schedule"))
  throw new Error("Solo se admite --schedule en Docker local.");
const secretsPath = LOCAL_EDGE_ENV_FILE;
const previous = existsSync(secretsPath)
  ? parseEnv(readFileSync(secretsPath, "utf8"))
  : {};
const previousN8n = existsSync(LOCAL_N8N_ENV_FILE)
  ? parseEnv(readFileSync(LOCAL_N8N_ENV_FILE, "utf8"))
  : {};
const edgePrevious = Object.fromEntries(
  Object.entries(previous).filter(([name]) => name !== "N8N_ENCRYPTION_KEY"),
);
const n8nEncryptionKey =
  previousN8n.N8N_ENCRYPTION_KEY ||
  previous.N8N_ENCRYPTION_KEY ||
  randomBytes(32).toString("hex");
const secret = (name: string) =>
  previous[name] || randomBytes(32).toString("hex");
const environment = {
  ...edgePrevious,
  APP_BASE_URL: "https://app.example.test",
  H06_DISPATCH_SECRET: secret("H06_DISPATCH_SECRET"),
  N8N_WEBHOOK_TOKEN: secret("N8N_WEBHOOK_TOKEN"),
  N8N_RECEIPT_TOKEN:
    previous.N8N_RECEIPT_TOKEN ||
    process.env.N8N_RECEIPT_TOKEN ||
    randomBytes(32).toString("hex"),
  H06_PROVIDER_TOKEN: secret("H06_PROVIDER_TOKEN"),
  N8N_WEBHOOK_URL: "http://host.docker.internal:5680/dispatch",
};
ensureEnvironmentDirectory(secretsPath);
writeFileSync(
  secretsPath,
  Object.entries(environment)
    .map(([name, value]) => `${name}=${value}`)
    .join("\n") + "\n",
);
const appEnvironment = parseEnv(readFileSync(".env.local", "utf8"));
if (
  appEnvironment.N8N_RECEIPT_TOKEN &&
  appEnvironment.N8N_RECEIPT_TOKEN !== environment.N8N_RECEIPT_TOKEN
)
  throw new Error(
    "Ya existe otro secreto local de receipts; conserva la configuración antes de cambiarla.",
  );
if (!appEnvironment.N8N_RECEIPT_TOKEN)
  writeFileSync(
    ".env.local",
    readFileSync(".env.local", "utf8") +
      `\nN8N_RECEIPT_TOKEN=${environment.N8N_RECEIPT_TOKEN}\n`,
  );
mkdirSync("test-results/local/h06-runtime", { recursive: true });
mkdirSync("test-results/local/h06-n8n", { recursive: true });
const workflow = JSON.parse(
  readFileSync("integrations/n8n/whatsapp-digest.workflow.json", "utf8"),
);
const serialized = JSON.stringify(workflow)
  .replaceAll(
    "https://SUPABASE_PROJECT.invalid",
    "http://host.docker.internal:54331",
  )
  .replaceAll(
    "https://WHATSAPP_PROVIDER.invalid",
    "http://host.docker.internal:5680",
  )
  .replaceAll(
    "https://TAXSKILL_APP.invalid",
    "http://host.docker.internal:3001",
  );
writeFileSync("test-results/local/h06-runtime/workflow.json", serialized);
const credentials = [
  {
    id: "taxskill-h06-webhook",
    name: "TaxSkill incoming digest",
    type: "httpHeaderAuth",
    data: {
      name: "Authorization",
      value: `Bearer ${environment.N8N_WEBHOOK_TOKEN}`,
    },
  },
  {
    id: "taxskill-h06-db",
    name: "TaxSkill database RPC",
    type: "httpCustomAuth",
    data: {
      json: JSON.stringify({
        headers: {
          apikey: process.env.SUPABASE_SECRET_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
        },
      }),
    },
  },
  {
    id: "taxskill-h06-provider",
    name: "TaxSkill WhatsApp provider",
    type: "httpHeaderAuth",
    data: {
      name: "Authorization",
      value: `Bearer ${environment.H06_PROVIDER_TOKEN}`,
    },
  },
  {
    id: "taxskill-h06-receipt",
    name: "TaxSkill receipt callback",
    type: "httpHeaderAuth",
    data: {
      name: "Authorization",
      value: `Bearer ${environment.N8N_RECEIPT_TOKEN}`,
    },
  },
];
writeFileSync(
  "test-results/local/h06-runtime/credentials.json",
  JSON.stringify(credentials),
);
const n8nEnvironment = {
  N8N_ENCRYPTION_KEY: n8nEncryptionKey,
  N8N_HOST: "127.0.0.1",
  N8N_PORT: "5678",
  N8N_PROTOCOL: "http",
  N8N_SECURE_COOKIE: "false",
  WEBHOOK_URL: "http://127.0.0.1:5679/",
  GENERIC_TIMEZONE: "America/Lima",
  TZ: "America/Lima",
  N8N_DIAGNOSTICS_ENABLED: "false",
  N8N_VERSION_NOTIFICATIONS_ENABLED: "false",
  N8N_PERSONALIZATION_ENABLED: "false",
  EXECUTIONS_DATA_SAVE_ON_ERROR: "none",
  EXECUTIONS_DATA_SAVE_ON_SUCCESS: "none",
  EXECUTIONS_DATA_SAVE_ON_PROGRESS: "false",
  N8N_BLOCK_ENV_ACCESS_IN_NODE: "true",
};
writeFileSync(
  LOCAL_N8N_ENV_FILE,
  Object.entries(n8nEnvironment)
    .map(([name, value]) => `${name}=${value}`)
    .join("\n") + "\n",
);
async function main() {
  if (process.argv.includes("--schedule")) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false } },
    );
    const result = await admin.rpc("h06_schedule", {
      p_function_url: "http://kong:8000/functions/v1/notification-operations",
      p_secret: environment.H06_DISPATCH_SECRET,
    });
    if (result.error) throw new Error("No se pudo programar H06 local.");
  }
  console.info(
    "Configuración Docker preparada. Workflow y credenciales locales en test-results; no se imprimen secretos. Reinicia Next.js y sirve Edge con .envs/local/edge.env.",
  );
}
main().catch(() => {
  console.error("No se completó el setup H06 local.");
  process.exitCode = 1;
});
