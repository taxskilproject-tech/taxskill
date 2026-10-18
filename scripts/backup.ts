import { createBackup } from "./operations/services/create-backup";
import {
  backupContext,
  backupMode,
} from "./operations/utils/backup-environment";

async function main() {
  if (process.argv.length !== 3)
    throw new Error("Usa yarn backup:local o yarn backup:cloud.");
  const directory = await createBackup(
    backupContext(backupMode(process.argv[2])),
  );
  console.info("Respaldo cifrado y comprobado: " + directory);
}
void main().catch((cause: unknown) => {
  console.error(
    cause instanceof Error
      ? cause.message
      : "No se pudo completar el respaldo.",
  );
  process.exitCode = 1;
});
