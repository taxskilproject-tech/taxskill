import { describe, expect, it } from "vitest";

import { storageBackupEntries } from "../scripts/operations/utils/backup-storage-index";

describe("inventario de respaldo en Storage", () => {
  const file = "a".repeat(64) + ".enc";

  it("ignora carpetas y nombres ajenos sin construir rutas fuera del prefijo", () => {
    const entries = storageBackupEntries(
      [
        { name: "../private.enc" },
        { name: "folder" },
        { name: file, metadata: { size: 915 } },
      ],
      "objects/key-id",
    );
    expect(entries).toEqual([[`objects/key-id/${file}`, 915]]);
  });

  it.each([null, {}, { size: -1 }, { size: 0.5 }, { size: "915" }])(
    "rechaza metadatos inválidos y evita reutilizar un objeto corrupto: %j",
    (metadata) => {
      function invalidInventory() {
        return storageBackupEntries([{ name: file, metadata }], "objects/key-id");
      }
      expect(invalidInventory).toThrow("INTEGRITY_FAILED");
    },
  );
});
