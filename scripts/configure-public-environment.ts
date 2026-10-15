import { existsSync, writeFileSync } from "node:fs";
import { z } from "zod";

import { isPublishableKey } from "../src/config/env/utils/validate-public-key";
import { runSupabase } from "./utils/run-supabase";

const destination = ".env.local";
const projectRef = process.argv[2];

if (!projectRef || !/^[a-z]{20}$/.test(projectRef)) {
  throw new Error(
    "Indica una referencia de proyecto válida: yarn env:setup <project-ref>.",
  );
}

if (existsSync(destination)) {
  throw new Error(
    ".env.local ya existe y no se sobrescribe. Conserva su configuración.",
  );
}

const output = runSupabase([
  "projects",
  "api-keys",
  "--project-ref",
  projectRef,
  "--output-format",
  "json",
]);
const schema = z.object({
  keys: z.array(
    z.object({
      api_key: z.string(),
      name: z.string().optional(),
      type: z.string().optional(),
    }),
  ),
});
const parsed = schema.safeParse(JSON.parse(output));

if (!parsed.success) {
  throw new Error(
    "No se pudo leer la configuración pública. No se guardó ningún valor.",
  );
}

const entry =
  parsed.data.keys.find((key) => key.type === "publishable") ??
  parsed.data.keys.find((key) => key.name === "anon");

if (!entry || !isPublishableKey(entry.api_key)) {
  throw new Error("El proyecto no devolvió una clave pública válida.");
}

const text = [
  "NEXT_PUBLIC_SUPABASE_URL=https://" + projectRef + ".supabase.co",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=" + entry.api_key,
  "",
].join("\n");

writeFileSync(destination, text, { encoding: "utf8", flag: "wx" });
console.info(
  "Configuración pública guardada en .env.local; no se almacenaron claves administrativas.",
);
