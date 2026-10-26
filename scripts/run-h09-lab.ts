import { spawn } from "node:child_process";

import { h09DocumentCompany } from "./utils/h09-document-company";
import { loadH09LabEnvironment } from "./utils/h09-lab-environment";

loadH09LabEnvironment();
const commands: Record<string, string[]> = {
  bootstrap: ["tsx", "scripts/bootstrap-admin.ts", "--demo"],
  seed: ["tsx", "scripts/fixtures/h09-demo.mts"],
  live: ["tsx", "scripts/fixtures/h09-live.mts"],
  documents: ["tsx", "scripts/verify-h03.ts"],
  build: ["build"],
  bundle: ["check:bundle"],
  start: ["start", "-H", "127.0.0.1", "-p", "4002"],
  types: ["typecheck"],
};
const command = commands[process.argv[2] ?? ""];
if (process.argv[2] === "documents")
  command.push("--company-id", h09DocumentCompany());
const yarn = process.env.npm_execpath;
if (!command || !yarn || !yarn.endsWith("yarn.js"))
  throw new Error(
    "Usa yarn tsx scripts/run-h09-lab.ts bootstrap|seed|live|documents|build|bundle|start|types.",
  );
const child = spawn(process.execPath, [yarn, ...command], {
  env: { ...process.env, CIRCLE_NODE_TOTAL: "3", RAYON_NUM_THREADS: "2" },
  stdio: "inherit",
  windowsHide: true,
});
child.on("error", () => {
  console.error("No se pudo iniciar la operación local H09.");
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
