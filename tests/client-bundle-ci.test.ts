import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(resolve(".github/workflows/ci.yml"), "utf8");
const canaries = Object.fromEntries(
  [...workflow.matchAll(/^ {6}([A-Z0-9_]+): (.+)$/gm)].map((match) => [
    match[1],
    match[2].replace(/^['"]|['"]$/g, ""),
  ]),
);

function runCleanBundle(leak: string | null) {
  const directory = mkdtempSync(join(tmpdir(), "taxskill-ci-bundle-"));
  const staticDirectory = join(directory, ".next", "static");
  mkdirSync(staticDirectory, { recursive: true });
  const bundle = join(staticDirectory, "client.js");
  writeFileSync(
    bundle,
    JSON.stringify({ value: leak ? canaries[leak] : "public" }),
  );
  try {
    return spawnSync(
      process.execPath,
      [
        "--import",
        pathToFileURL(resolve("node_modules/tsx/dist/loader.mjs")).href,
        resolve("scripts/check-client-bundle.ts"),
      ],
      {
        cwd: directory,
        env: { ...process.env, ...canaries },
        encoding: "utf8",
        windowsHide: true,
      },
    );
  } finally {
    unlinkSync(bundle);
    rmdirSync(staticDirectory);
    rmdirSync(join(directory, ".next"));
    rmdirSync(directory);
  }
}

describe("verificación real del bundle con el entorno de CI", () => {
  it("funciona sin .env ni credenciales productivas", () => {
    const result = runCleanBundle(null);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Bundle del navegador verificado");
  });
  it.each([
    "SUPABASE_SECRET_KEY",
    "IDEMPOTENCY_HMAC_KEY",
    "N8N_RECEIPT_TOKEN",
    "N8N_WEBHOOK_TOKEN",
    "H06_DISPATCH_SECRET",
  ])("rechaza la filtración de %s sin imprimir su valor", (name) => {
    expect(canaries[name]).toBeTruthy();
    const result = runCleanBundle(name);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Credencial privada detectada");
    expect(result.stderr).not.toContain(canaries[name]);
  });
});
