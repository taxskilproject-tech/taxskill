import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "../src/lib/supabase/types/database.types";

async function main() {
  loadEnvConfig(process.cwd());
  const demo = process.argv.includes("--demo");
  const destination = demo ? ".env.h02-demo.local" : ".env.bootstrap.local";
  const admin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SECRET_KEY ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const existing = await admin.from("organizations").select("id").limit(1);
  if (existing.error)
    throw new Error("No se pudo comprobar el estado del bootstrap.");
  if (!existsSync(destination) && existing.data.length)
    throw new Error(
      "Ya existe un estudio. El bootstrap inicial no se vuelve a ejecutar.",
    );
  if (demo && !existsSync(destination)) {
    const lines = [
      "BOOTSTRAP_EMAIL=admin.h02@example.test",
      "BOOTSTRAP_NAME=Administrador de demostración",
      "BOOTSTRAP_PASSWORD=" + randomBytes(24).toString("base64url"),
      "BOOTSTRAP_USER_ID=" + randomUUID(),
      "",
    ];
    writeFileSync(destination, lines.join("\n"), { flag: "wx" });
  }
  if (!existsSync(destination))
    throw new Error(
      "Completa .env.bootstrap.local según docs/desarrollo.md antes de iniciar.",
    );
  const parsed = z
    .object({
      BOOTSTRAP_EMAIL: z.email(),
      BOOTSTRAP_NAME: z.string().min(2),
      BOOTSTRAP_PASSWORD: z.string().min(12),
      BOOTSTRAP_USER_ID: z.uuid().optional(),
    })
    .safeParse(parseEnv(readFileSync(destination, "utf8")));
  if (!parsed.success)
    throw new Error(
      "La configuración del bootstrap es incompleta. No se muestran sus valores.",
    );
  const input = parsed.data;
  const userId = input.BOOTSTRAP_USER_ID ?? randomUUID();
  if (!input.BOOTSTRAP_USER_ID)
    writeFileSync(
      destination,
      readFileSync(destination, "utf8") +
        "\nBOOTSTRAP_USER_ID=" +
        userId +
        "\n",
    );
  const found = await admin.auth.admin.getUserById(userId);
  if (!found.data.user) {
    const created = await admin.auth.admin.createUser({
      id: userId,
      email: input.BOOTSTRAP_EMAIL,
      password: input.BOOTSTRAP_PASSWORD,
      email_confirm: true,
    });
    if (created.error)
      throw new Error(
        "No se pudo crear la identidad inicial. Revisa el estado de Auth sin compartir credenciales.",
      );
  }
  if (!existing.data.length) {
    const initialized = await admin.rpc("h02_bootstrap", {
      p_user_id: userId,
      p_name: input.BOOTSTRAP_NAME,
    });
    if (initialized.error)
      throw new Error(
        "Identidad conservada; reintenta el bootstrap para completar SQL.",
      );
  }
  console.info(
    "Administrador inicial disponible. Credenciales únicamente en " +
      destination +
      " (excluido de Git).",
  );
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Bootstrap incompleto.",
  );
  process.exitCode = 1;
});
