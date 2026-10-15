import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import ts from "typescript";

const sourceRoot = resolve("src");
const componentLimit = 170;
const violations: string[] = [];

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(filename) : [filename];
  });
}

function parseFile(filename: string) {
  return ts.createSourceFile(
    filename,
    readFileSync(filename, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
}

function validateSyntaxNode(node: ts.Node, filename: string): void {
  const isType =
    ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node);
  if (isType && !filename.replaceAll("\\", "/").includes("/types/")) {
    violations.push(filename + ": el tipado debe declararse en types/.");
  }
  if (ts.isJsxAttribute(node) && node.name.getText() === "style") {
    violations.push(filename + ": usa Tailwind, no estilos inline.");
  }
  ts.forEachChild(node, (child) => validateSyntaxNode(child, filename));
}

function resolveLocalImport(
  filename: string,
  specifier: string,
): string | undefined {
  const base = specifier.startsWith("@/")
    ? join(sourceRoot, specifier.slice(2))
    : resolve(dirname(filename), specifier);

  if (!specifier.startsWith("@/") && !specifier.startsWith("."))
    return undefined;

  return [
    base + ".ts",
    base + ".tsx",
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ].find((candidate) => existsSync(candidate));
}

function getLocalImports(filename: string): string[] {
  return parseFile(filename)
    .statements.filter(ts.isImportDeclaration)
    .flatMap((statement) => {
      if (!ts.isStringLiteral(statement.moduleSpecifier)) return [];
      const target = resolveLocalImport(
        filename,
        statement.moduleSpecifier.text,
      );
      return target ? [target] : [];
    });
}

function checkDependencyPath(
  filename: string,
  graph: ReadonlyMap<string, readonly string[]>,
  trail: readonly string[],
): void {
  if (trail.includes(filename)) {
    violations.push(
      "Dependencia circular: " + [...trail, filename].join(" -> "),
    );
    return;
  }
  for (const dependency of graph.get(filename) ?? []) {
    checkDependencyPath(dependency, graph, [...trail, filename]);
  }
}

function checkClientBoundary(
  filename: string,
  graph: ReadonlyMap<string, readonly string[]>,
  visited: ReadonlySet<string>,
): void {
  if (visited.has(filename)) return;
  const content = readFileSync(filename, "utf8");
  if (
    filename.endsWith(".server.ts") ||
    content.includes('import "server-only"')
  ) {
    violations.push(
      "Un módulo cliente alcanza código de servidor: " + filename,
    );
    return;
  }
  for (const dependency of graph.get(filename) ?? []) {
    checkClientBoundary(dependency, graph, new Set([...visited, filename]));
  }
}

const files = listFiles(sourceRoot);
const codeFiles = files.filter((filename) =>
  [".ts", ".tsx"].includes(extname(filename)),
);
const graph = new Map(
  codeFiles.map((filename) => [filename, getLocalImports(filename)]),
);

for (const filename of codeFiles) {
  const content = readFileSync(filename, "utf8");
  if (
    filename.endsWith(".tsx") &&
    content.trimEnd().split(/\r?\n/).length > componentLimit
  ) {
    violations.push(filename + ": supera 170 líneas.");
  }
  validateSyntaxNode(parseFile(filename), filename);
  checkDependencyPath(filename, graph, []);
  if (/^["']use client["'];/.test(content)) {
    checkClientBoundary(filename, graph, new Set());
  }
}

for (const filename of files.filter((file) => extname(file) === ".css")) {
  if (filename !== join(sourceRoot, "app/globals.css")) {
    violations.push(filename + ": no se permite CSS personalizado.");
  }
}

if (
  readFileSync(join(sourceRoot, "app/globals.css"), "utf8").trim() !==
  '@import "tailwindcss";'
) {
  violations.push(
    "globals.css solo puede cargar la infraestructura de Tailwind.",
  );
}

if (files.some((filename) => /[/\\]middleware\.[jt]s$/.test(filename))) {
  violations.push("Usa Proxy, no middleware.");
}

if (violations.length) {
  console.error([...new Set(violations)].join("\n"));
  process.exitCode = 1;
} else {
  console.info(
    "Arquitectura verificada: tipos separados, componentes <=170 líneas, sin ciclos, secretos aislados y Tailwind.",
  );
}
