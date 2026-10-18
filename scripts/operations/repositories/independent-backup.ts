import { spawnSync } from "node:child_process";

import { s3IndexSchema } from "../contracts/s3.schema";
import { backupHash } from "../utils/backup-crypto";

function backupDestination() {
  const destination = process.env.H08_BACKUP_S3_URI ?? "";
  const match =
    /^s3:\/\/([a-z0-9][a-z0-9.-]{1,61}[a-z0-9])(?:\/([a-zA-Z0-9/_-]*))?$/.exec(
      destination,
    );
  if (!match) throw new Error("Destino S3 de respaldo inválido.");
  return { bucket: match[1], prefix: (match[2] ?? "").replace(/\/$/, "") };
}
function aws(args: readonly string[]): string {
  const result = spawnSync(
    "aws",
    [
      ...args,
      "--no-cli-pager",
      "--cli-connect-timeout",
      "15",
      "--cli-read-timeout",
      "60",
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, windowsHide: true },
  );
  if (result.error || result.status !== 0)
    throw new Error(
      "No se pudo verificar o copiar el respaldo independiente S3.",
    );
  return result.stdout;
}
export function backupObjectKey(key: string, sha256: string): string {
  const destination = backupDestination();
  const keyId = backupHash(Buffer.from(key, "hex")).slice(0, 16);
  return [destination.prefix, "objects", keyId, sha256 + ".enc"]
    .filter(Boolean)
    .join("/");
}
export function independentObjectIndex(
  key: string,
): ReadonlyMap<string, number> {
  const destination = backupDestination();
  const prefix = backupObjectKey(key, "").replace(/\.enc$/, "");
  const listed = s3IndexSchema.parse(
    JSON.parse(
      aws([
        "s3api",
        "list-objects-v2",
        "--bucket",
        destination.bucket,
        "--prefix",
        prefix,
        "--output",
        "json",
      ]),
    ),
  );
  return new Map(
    (listed.Contents ?? []).map((object) => [object.Key, object.Size]),
  );
}
export function publishBackupObject(
  file: string,
  key: string,
  sha256: string,
): void {
  const destination = backupDestination();
  aws([
    "s3",
    "cp",
    file,
    `s3://${destination.bucket}/${backupObjectKey(key, sha256)}`,
    "--only-show-errors",
    "--sse",
    "AES256",
  ]);
}
export function downloadBackupObject(
  file: string,
  key: string,
  sha256: string,
): void {
  const destination = backupDestination();
  aws([
    "s3",
    "cp",
    `s3://${destination.bucket}/${backupObjectKey(key, sha256)}`,
    file,
    "--only-show-errors",
  ]);
}
export function publishIndependentBackup(directory: string, id: string): void {
  const destination = backupDestination();
  const prefix = [destination.prefix, "runs", id].filter(Boolean).join("/");
  aws([
    "s3",
    "cp",
    directory,
    `s3://${destination.bucket}/${prefix}/`,
    "--recursive",
    "--exclude",
    "objects/*",
    "--only-show-errors",
    "--sse",
    "AES256",
  ]);
}
