import { randomBytes } from "node:crypto";
import { appendFileSync, readFileSync } from "node:fs";
import { z } from "zod";

import { runSupabase } from "./utils/run-supabase";

const projectRef = process.argv[2];
if (!projectRef || !/^[a-z]{20}$/.test(projectRef))
  throw new Error(
    "Indica el project-ref Cloud previsto; para Docker utiliza yarn env:local.",
  );
const current = readFileSync(".env.local", "utf8");
if (!current.includes("https://" + projectRef + ".supabase.co"))
  throw new Error("El proyecto no coincide con .env.local.");
const output = runSupabase([
  "projects",
  "api-keys",
  "--project-ref",
  projectRef,
  "--reveal",
  "--output-format",
  "json",
]);
const parsed = z
  .object({
    keys: z.array(
      z.object({ api_key: z.string(), type: z.string().optional() }),
    ),
  })
  .parse(JSON.parse(output));
const secret = parsed.keys.find(
  (key) => key.type === "secret" && key.api_key.startsWith("sb_secret_"),
);
if (!secret)
  throw new Error(
    "No se obtuvo una clave secreta válida. No se guardaron valores.",
  );
const additions: string[] = [];
if (!/^SUPABASE_SECRET_KEY=.+/m.test(current))
  additions.push("SUPABASE_SECRET_KEY=" + secret.api_key);
if (!/^IDEMPOTENCY_HMAC_KEY=.+/m.test(current))
  additions.push("IDEMPOTENCY_HMAC_KEY=" + randomBytes(32).toString("hex"));
if (additions.length)
  appendFileSync(".env.local", "\n" + additions.join("\n") + "\n");
console.info(
  "Configuración administrativa local preparada; valores privados omitidos.",
);
