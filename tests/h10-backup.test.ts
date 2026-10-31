import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, it } from "vitest";

import { backupObjectSchema } from "../scripts/operations/contracts/recovery.schema";
import { copyBackupObjects } from "../scripts/operations/repositories/backup-storage";
import { decryptBackup } from "../scripts/operations/utils/backup-crypto";
import type { Database } from "../src/lib/supabase/types/database.types";

it("respalda bytes del adjunto SUNAT cifrados y conserva sus metadatos para restaurar", async () => {
  const bytes = Buffer.from("%PDF-fixture-local");
  const hash = createHash("sha256").update(bytes).digest("hex");
  const client = createClient<Database>(
    "http://127.0.0.1:54431",
    "fixture-only",
    {
      auth: { persistSession: false },
      global: {
        fetch: async (input) => {
          const url = new URL(String(input));
          if (url.origin !== "http://127.0.0.1:54431")
            throw new Error("REMOTE_TEST_BLOCKED");
          if (url.pathname.endsWith("/document_versions"))
            return Response.json([]);
          if (url.pathname.endsWith("/sunat_attachments"))
            return Response.json([
              {
                id: "local",
                object_name: "private/fixture.pdf",
                sha256: hash,
                byte_size: bytes.length,
                mime_type: "application/pdf",
              },
            ]);
          if (url.pathname.includes("/storage/v1/object/"))
            return new Response(bytes, {
              headers: { "content-type": "application/pdf" },
            });
          throw new Error("UNEXPECTED_LOCAL_REQUEST");
        },
      },
    },
  );
  const root = resolve("test-results/local");
  mkdirSync(root, { recursive: true });
  const directory = mkdtempSync(join(root, "h10-backup-"));
  const key = "ab".repeat(32);
  try {
    const objects = await copyBackupObjects(
      {
        mode: "local",
        key,
        directory,
        client,
      },
      directory,
    );
    expect(objects).toEqual([
      expect.objectContaining({
        bucket: "sunat-mailbox",
        path: "private/fixture.pdf",
        sha256: hash,
      }),
    ]);
    const encrypted = readFileSync(join(directory, objects[0].file));
    expect(encrypted.includes(bytes)).toBe(false);
    expect(decryptBackup(encrypted, key)).toEqual(bytes);
    expect(backupObjectSchema.safeParse(objects[0]).success).toBe(true);
    expect(
      backupObjectSchema.safeParse({ ...objects[0], bucket: "public" }).success,
    ).toBe(false);
  } finally {
    if (dirname(directory) !== root)
      throw new Error("UNEXPECTED_TEST_DIRECTORY");
    rmSync(directory, { recursive: true });
  }
});
