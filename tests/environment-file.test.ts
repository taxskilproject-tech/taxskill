import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { expect, it } from "vitest";

import {
  parseEnvironment,
  saveEnvironmentFile,
} from "../scripts/utils/environment-file";

it("conserva keyrings JSON, rutas y signos sin alterar secretos al exportar", () => {
  const directory = mkdtempSync(join(tmpdir(), "taxskill-env-"));
  try {
    const file = join(directory, "private.env");
    const values = {
      KEYRING: JSON.stringify({ production: "ab".repeat(32) }),
      PATH_VALUE: "C:\\local\\cert.crt",
      SIMPLE: "123",
      HASH_VALUE: "a#b",
      EMPTY: "",
    };
    saveEnvironmentFile(file, values);
    expect(parseEnvironment(readFileSync(file, "utf8"))).toEqual(values);
  } finally {
    if (
      dirname(resolve(directory)) !== resolve(tmpdir()) ||
      !directory.includes("taxskill-env-")
    )
      throw new Error("UNEXPECTED_TEST_DIRECTORY");
    rmSync(directory, { recursive: true });
  }
});
