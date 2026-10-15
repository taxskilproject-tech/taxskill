import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { runSupabase } from "./utils/run-supabase";

const allowedTargets = ["--linked", "--local"];
const target = process.argv[2] ?? "--linked";

if (!allowedTargets.includes(target) || process.argv.length > 3) {
  throw new Error("Usa --linked o --local para generar los tipos.");
}

const generated = runSupabase([
  "gen",
  "types",
  "typescript",
  target,
  "--schema",
  "public",
]);

if (!generated.includes("export type Database =")) {
  throw new Error(
    "El CLI no devolvió tipos válidos. Se conserva el archivo anterior.",
  );
}

const destination = resolve("src/lib/supabase/types/database.types.ts");
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(
  destination,
  "// Generado con yarn db:types. No editar manualmente.\n" + generated,
  "utf8",
);
console.info(
  "Tipos del esquema public generados en src/lib/supabase/types/database.types.ts",
);
