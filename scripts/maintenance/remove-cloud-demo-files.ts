import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "../../src/lib/supabase/types/database.types";
import { runSupabase } from "../utils/run-supabase";

const projectRef = "gzwrqvqofcrdjvzoblaz";
const organizationId = "2803cd5e-8343-46ea-b300-c55ce84c92f1";
const identities = new Map([
  ["0e09d258-f462-4fa7-aa47-0f012abe2f86", "admin.h02@example.test"],
  ["9300cc45-84b8-435c-b742-0af4c16d1b57", "contador.h02@example.test"],
  ["521e6a37-869c-41e6-a99e-6341b7412952", "supervisor.h02@example.test"],
  ["b209854d-29ff-4077-ae23-6ef79b8c2e94", "cliente.h02@example.test"],
  ["5794b31a-42e5-4ae8-9c3a-ca54c1da1045", "recuperacion.h02@example.test"],
]);
const credentialPath = existsSync(".env.cloud.local")
  ? ".env.cloud.local"
  : ".env.local";
const credentials = parseEnv(readFileSync(credentialPath, "utf8"));
if (
  credentials.NEXT_PUBLIC_SUPABASE_URL !==
    `https://${projectRef}.supabase.co` ||
  readFileSync("supabase/.temp/project-ref", "utf8").trim() !== projectRef ||
  !credentials.SUPABASE_SECRET_KEY?.startsWith("sb_secret_")
)
  throw new Error(
    "Destino o credencial de mantenimiento inválidos; no se ejecuta ninguna operación.",
  );

const discovery = z
  .object({
    rows: z.array(z.object({ resource: z.string(), records: z.unknown() })),
  })
  .parse(
    JSON.parse(
      readFileSync("test-results/cloud-cleanup-discovery.json", "utf8"),
    ),
  );
const files = z
  .array(
    z.object({
      id: z.uuid(),
      bucket: z.enum(["documents", "document-reception"]),
      path: z.string(),
    }),
  )
  .parse(discovery.rows.find((row) => row.resource === "storage")?.records);
const verified = z
  .object({
    rows: z.array(z.object({ files: z.number(), unknown_files: z.literal(0) })),
  })
  .parse(
    JSON.parse(
      readFileSync("test-results/cloud-file-cleanup-before.json", "utf8"),
    ),
  ).rows[0];
if (
  !verified ||
  files.length !== verified.files ||
  files.length !== 19 ||
  files.some((file) => !file.path.startsWith(`${organizationId}/`))
)
  throw new Error(
    "El inventario de archivos no coincide; no se ejecuta la limpieza.",
  );

const admin = createClient<Database>(
  `https://${projectRef}.supabase.co`,
  credentials.SUPABASE_SECRET_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);
async function removeAccounts() {
  const ids = [...identities.keys()];
  const profiles = await admin
    .from("profiles")
    .select("user_id")
    .in("user_id", ids);
  if (profiles.error || profiles.data.length)
    throw new Error(
      "No se borran identidades mientras existan perfiles o dependencias de aplicación.",
    );
  for (const [id, email] of identities) {
    const found = await admin.auth.admin.getUserById(id);
    if (found.error?.status === 404) continue;
    if (found.error || found.data.user?.email !== email)
      throw new Error(
        "La identidad no coincide; se detiene el borrado de cuentas.",
      );
    const removed = await admin.auth.admin.deleteUser(id, false);
    if (removed.error)
      throw new Error("No se pudo eliminar una identidad ficticia.");
  }
  writeFileSync(
    "test-results/cloud-account-cleanup-result.json",
    JSON.stringify(
      {
        project_ref: projectRef,
        recorded_at: new Date().toISOString(),
        deleted_account_ids: ids,
        status: "account_deletions_completed",
      },
      null,
      2,
    ),
  );
  console.info(
    "Las cinco identidades ficticias se eliminaron físicamente mediante Auth Admin.",
  );
}
async function main() {
  if (!process.argv.includes("--execute"))
    throw new Error(
      "La limpieza puntual requiere --execute; no es un seed ni una prueba.",
    );
  if (process.argv.includes("--delete-accounts")) return removeAccounts();
  for (const [id, email] of identities) {
    const found = await admin.auth.admin.getUserById(id);
    if (found.error || found.data.user?.email !== email)
      throw new Error(
        "Cambió la identidad de una cuenta; mantenimiento detenido.",
      );
  }
  runSupabase([
    "db",
    "query",
    "--linked",
    "--file",
    "test-results/freeze-cloud-demo.sql",
  ]);
  for (const [id] of identities) {
    const banned = await admin.auth.admin.updateUserById(id, {
      ban_duration: "876000h",
    });
    if (banned.error || !banned.data.user?.banned_until)
      throw new Error(
        "No se pudo bloquear una cuenta ficticia; revisa el estado antes de continuar.",
      );
  }
  for (const bucket of ["documents", "document-reception"]) {
    const paths = files
      .filter((file) => file.bucket === bucket)
      .map((file) => file.path);
    const removed = await admin.storage.from(bucket).remove(paths);
    if (removed.error || removed.data?.length !== paths.length)
      throw new Error(
        "La eliminación de archivos no terminó; conservar el inventario y verificar Storage.",
      );
  }
  writeFileSync(
    "test-results/cloud-file-cleanup-result.json",
    JSON.stringify(
      {
        project_ref: projectRef,
        organization_id: organizationId,
        recorded_at: new Date().toISOString(),
        removed_files: files.length,
        blocked_accounts: identities.size,
        physical_database_cleanup: "awaiting_history_guard_authorization",
      },
      null,
      2,
    ),
  );
  console.info(
    "19 archivos ficticios eliminados; cinco cuentas bloqueadas y estudio de demostración eliminado lógicamente. El borrado físico DB permanece pendiente de autorización para la protección histórica.",
  );
}
main().catch(() => {
  console.error(
    "Limpieza incompleta. Revisa el inventario y el estado remoto; no se imprimen credenciales.",
  );
  process.exitCode = 1;
});
