import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import ts from "typescript";

const destination = resolve(".sunat-worker-build");
const visited = new Set<string>();
function compile(filename: string): void {
  if (visited.has(filename)) return;
  visited.add(filename);
  const target = resolve(
    destination,
    relative(process.cwd(), filename),
  ).replace(/\.ts$/, ".js");
  const original = readFileSync(filename, "utf8");
  const input = original.replace(
    /from\s+(["'])@\/([^"']+)\1/g,
    (_, quote: string, alias: string) => {
      const path = relative(
        dirname(filename),
        resolve("src", alias),
      ).replaceAll("\\", "/");
      return `from ${quote}${path.startsWith(".") ? path : "./" + path}${quote}`;
    },
  );
  const source = ts.createSourceFile(
    filename,
    input,
    ts.ScriptTarget.Latest,
    true,
  );
  const dependencies = source.statements
    .filter(
      (statement) =>
        ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement),
    )
    .flatMap((statement) => {
      if (
        !statement.moduleSpecifier ||
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        (ts.isImportDeclaration(statement) &&
          statement.importClause?.isTypeOnly) ||
        (ts.isExportDeclaration(statement) && statement.isTypeOnly)
      )
        return [];
      const name = statement.moduleSpecifier.text;
      if (!name.startsWith(".")) return [];
      const dependency = resolve(dirname(filename), name + ".ts");
      if (!existsSync(dependency)) throw new Error("WORKER_IMPORT_UNRESOLVED");
      return [dependency];
    });
  dependencies.forEach(compile);
  const output = ts.transpileModule(input, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  });
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, output.outputText);
}
compile(resolve("scripts/sunat-worker/worker.ts"));
compile(resolve("scripts/sunat-worker/run-one.ts"));
if (existsSync("scripts/sunat-worker/pilot.ts"))
  compile(resolve("scripts/sunat-worker/pilot.ts"));
if (existsSync("scripts/sunat-worker/source-probe.ts"))
  compile(resolve("scripts/sunat-worker/source-probe.ts"));
console.log(
  `Worker preparado: ${visited.size} módulos propios; dependencias del yarn.lock raíz.`,
);
