import { fetchStorageBackup } from "./operations/services/fetch-storage-backup";
import { backupStorageContext } from "./operations/utils/backup-environment";

async function main() {
  if (process.argv.length !== 3)
    throw new Error(
      "Usa yarn backup:fetch <id-del-respaldo> con configuración Cloud privada.",
    );
  const directory = await fetchStorageBackup(
    backupStorageContext("cloud"),
    process.argv[2],
  );
  console.info("Respaldo descargado, descifrado y contrastado: " + directory);
}

void main().catch((cause: unknown) => {
  console.error(
    cause instanceof Error
      ? cause.message
      : "No se pudo descargar el respaldo.",
  );
  process.exitCode = 1;
});
