import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

import { restoreBackup } from "./operations/services/restore-backup";
import { backupContext } from "./operations/utils/backup-environment";

async function main() {
  if (process.argv.length !== 4)
    throw new Error(
      "Usa yarn restore:local <carpeta-backup> <archivo-configuración-local>.",
    );
  const context = backupContext("local");
  const configuration = parseEnv(
    readFileSync(resolve(process.argv[3]), "utf8"),
  );
  const target = {
    container: configuration.H08_RESTORE_CONTAINER ?? "",
    url: configuration.H08_RESTORE_URL ?? "",
    secret: configuration.H08_RESTORE_SECRET ?? "",
  };
  const manifest = await restoreBackup(
    resolve(process.argv[2]),
    context.key,
    target,
  );
  console.info(
    `Recuperación aislada verificada: ${manifest.objects.length} objetos; sesiones revocadas y jobs detenidos.`,
  );
}
void main().catch((cause: unknown) => {
  console.error(
    cause instanceof Error
      ? cause.message
      : "No se pudo completar la restauración aislada.",
  );
  process.exitCode = 1;
});
