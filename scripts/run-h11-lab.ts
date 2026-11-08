import { spawn } from "node:child_process";

import { loadH11LabEnvironment } from "./utils/h11-lab-environment";

const environment = loadH11LabEnvironment();
const commands: Readonly<Record<string, string[]>> = {
  seed: ["tsx", "scripts/fixtures/h11-demo.mts"],
  build: ["build", "--webpack"],
  start: ["start", "-H", "127.0.0.1", "-p", "4011"],
  bundle: ["check:bundle"],
  types: ["typecheck"],
  ui: ["tsx", "scripts/verify-h11-ui.mts"],
};
const command = commands[process.argv[2] ?? ""];
const yarn = process.env.npm_execpath;
if (!command || !yarn?.endsWith("yarn.js"))
  throw new Error(
    "Usa yarn tsx scripts/run-h11-lab.ts seed|build|start|bundle|types|ui.",
  );
const child = spawn(process.execPath, [yarn, ...command], {
  env: {
    ...process.env,
    ...environment,
    CIRCLE_NODE_TOTAL: "2",
    RAYON_NUM_THREADS: "2",
    SUNAT_EXECUTION_MODE: "local",
    SUNAT_SOURCE_VALIDATED: "false",
    SUNAT_DAILY_ENABLED: "false",
  },
  stdio: "inherit",
  windowsHide: true,
});
child.on("error", () => {
  console.error("No se pudo iniciar el laboratorio H11.");
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
