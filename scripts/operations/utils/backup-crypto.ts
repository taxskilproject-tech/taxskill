import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const MAGIC = Buffer.from("TSB1");
const IV_BYTES = 12;
const TAG_BYTES = 16;
const TAG_OFFSET = MAGIC.length + IV_BYTES;
export const BACKUP_ENVELOPE_BYTES = TAG_OFFSET + TAG_BYTES;
export function backupHash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
function encryptionKey(value: string): Buffer {
  if (!/^[a-f0-9]{64}$/i.test(value))
    throw new Error(
      "Configura una clave de respaldo de 32 bytes en hexadecimal.",
    );
  return Buffer.from(value, "hex");
}
export function encryptBackup(bytes: Uint8Array, key: string): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(key), iv);
  const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), encrypted]);
}
export function decryptBackup(bytes: Buffer, key: string): Buffer {
  if (
    bytes.length < BACKUP_ENVELOPE_BYTES ||
    !bytes.subarray(0, MAGIC.length).equals(MAGIC)
  )
    throw new Error("INTEGRITY_FAILED");
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(key),
      bytes.subarray(MAGIC.length, TAG_OFFSET),
    );
    decipher.setAuthTag(bytes.subarray(TAG_OFFSET, BACKUP_ENVELOPE_BYTES));
    return Buffer.concat([
      decipher.update(bytes.subarray(BACKUP_ENVELOPE_BYTES)),
      decipher.final(),
    ]);
  } catch {
    throw new Error("INTEGRITY_FAILED");
  }
}
