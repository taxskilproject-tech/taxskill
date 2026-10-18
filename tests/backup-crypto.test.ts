import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";

import { recoveryManifestSchema } from "../scripts/operations/contracts/recovery.schema";
import {
  decryptBackup,
  encryptBackup,
} from "../scripts/operations/utils/backup-crypto";

describe("respaldo autenticado", () => {
  it("recupera bytes originales y detecta alteración o clave incorrecta", () => {
    const key = randomBytes(32).toString("hex");
    const original = Buffer.from("fixture privado de respaldo");
    const encrypted = encryptBackup(original, key);
    expect(decryptBackup(encrypted, key)).toEqual(original);
    function wrongKey() {
      return decryptBackup(encrypted, randomBytes(32).toString("hex"));
    }
    expect(wrongKey).toThrow("INTEGRITY_FAILED");
    const altered = Buffer.from(encrypted);
    altered[altered.length - 1] ^= 1;
    function tampered() {
      return decryptBackup(altered, key);
    }
    expect(tampered).toThrow("INTEGRITY_FAILED");
    expect(encrypted.includes(original)).toBe(false);
  });
  it("rechaza manifiestos con rutas de archivo fuera del respaldo", () => {
    expect(
      recoveryManifestSchema.shape.objects.element.shape.file.safeParse(
        "../../private",
      ).success,
    ).toBe(false);
    expect(
      recoveryManifestSchema.shape.objects.element.shape.path.safeParse(
        "folder/../secret",
      ).success,
    ).toBe(false);
  });
});
