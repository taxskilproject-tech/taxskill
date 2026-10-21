import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function inspectClientBundle(
  directory: string,
  secrets: readonly string[],
): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      inspectClientBundle(path, secrets);
      continue;
    }
    const content = readFileSync(path, "utf8");
    if (secrets.some((secret) => content.includes(secret)))
      throw new Error(
        "Credencial privada detectada en un recurso de navegador: " + path,
      );
  }
}
