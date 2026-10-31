import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";

const IMAGE = "docker.n8n.io/n8nio/n8n:2.0.0";
const LAB_ROOT = resolve("test-results/local/h10-worker");
const APPLICATION = join(LAB_ROOT, "application");
const RESULTS = join(LAB_ROOT, "results");

function listTypescript(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? listTypescript(join(directory, entry.name))
      : [join(directory, entry.name)].filter((file) => file.endsWith(".ts")),
  );
}

function prepareLabSource(): void {
  const files = [
    ...listTypescript("scripts/sunat-pilot/worker"),
    "scripts/fixtures/h10-worker-lab.ts",
  ];
  for (const filename of files) {
    const destination = join(APPLICATION, filename.replace(/\.ts$/, ".js"));
    const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    });
    mkdirSync(resolve(destination, ".."), { recursive: true });
    writeFileSync(destination, compiled.outputText);
  }
  mkdirSync(RESULTS, { recursive: true });
  mkdirSync(join(APPLICATION, "node_modules/zod"), { recursive: true });
}

function runDockerLab(): void {
  if (process.argv.length > 2) throw new Error("H10_LAB_ARGUMENT_INVALID");
  const image = spawnSync("docker", ["image", "inspect", IMAGE], {
    stdio: "ignore",
    windowsHide: true,
  });
  if (image.error || image.status !== 0)
    throw new Error("DOCKER_LOCAL_IMAGE_REQUIRED");
  prepareLabSource();
  const result = spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "--name",
      "taxskill-h10-worker-" + process.pid,
      "--network",
      "none",
      "--read-only",
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
      "--memory",
      "256m",
      "--cpus",
      "0.5",
      "--pids-limit",
      "64",
      "--env",
      "TAXSKILL_H10_DOCKER_LAB=1",
      "--mount",
      "type=bind,source=" + APPLICATION + ",target=/app,readonly",
      "--mount",
      "type=bind,source=" +
        resolve("node_modules/zod") +
        ",target=/app/node_modules/zod,readonly",
      "--mount",
      "type=bind,source=" + RESULTS + ",target=/results",
      "--entrypoint",
      "node",
      IMAGE,
      "--max-old-space-size=128",
      "/app/scripts/fixtures/h10-worker-lab.js",
    ],
    { stdio: "inherit", timeout: 60000, windowsHide: true },
  );
  if (result.error || result.status !== 0)
    throw new Error("H10_LOCAL_WORKER_LAB_FAILED");
  console.log(
    "Evidencia local: " +
      relative(process.cwd(), join(RESULTS, "worker-lab.json")),
  );
}

try {
  runDockerLab();
} catch (error) {
  console.error(error instanceof Error ? error.message : "H10_LAB_FAILED");
  process.exitCode = 1;
}
