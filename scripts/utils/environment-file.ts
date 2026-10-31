import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseEnv } from "node:util";
import { z } from "zod";

import type { EnvironmentValues } from "../types/environment.types";

export function readEnvironmentFile(path: string): Record<string, string> {
  return existsSync(path) ? parseEnvironment(readFileSync(path, "utf8")) : {};
}
export function parseEnvironment(contents: string): Record<string, string> {
  return z.record(z.string(), z.string()).parse(parseEnv(contents));
}
export function ensureEnvironmentDirectory(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
}
function quoteEnvironmentValue(value: string): string {
  const quoted = JSON.stringify(value);
  if (parseEnv("VALUE=" + quoted).VALUE === value) return quoted;
  if (!value.includes("'")) return "'" + value + "'";
  throw new Error(
    "No se puede representar este valor de entorno sin alterarlo.",
  );
}
export function saveEnvironmentFile(
  path: string,
  values: EnvironmentValues,
): void {
  const entries = Object.entries(values);
  if (
    entries.some(
      ([name, value]) =>
        !/^[A-Z][A-Z0-9_]*$/.test(name) || /[\r\n]/.test(value),
    )
  )
    throw new Error(
      "Configuración de entorno inválida; no se guardaron valores.",
    );
  const content =
    entries
      .map(([name, value]) => `${name}=${quoteEnvironmentValue(value)}`)
      .join("\n") + "\n";
  const parsed = parseEnv(content);
  if (entries.some(([name, value]) => parsed[name] !== value))
    throw new Error("La configuración no conserva sus valores originales.");
  ensureEnvironmentDirectory(path);
  writeFileSync(path, content, { mode: 0o600 });
}
