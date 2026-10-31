import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { z } from "zod";

import { loadH09LabEnvironment } from "./utils/h09-lab-environment";

const base = loadH09LabEnvironment();
if (process.argv[2] === "verify:foreground") {
  const running = execFileSync(
    "docker",
    [
      "ps",
      "--filter",
      "name=^/taxskill-h10-worker$",
      "--format",
      "{{.Status}}",
    ],
    { encoding: "utf8", windowsHide: true },
  ).trim();
  if (running)
    throw new Error(
      "La regresión de cola requiere un laboratorio sin consumidor activo. Usa verify para comprobar accesos sin interrumpir la presentación.",
    );
}
const directory = ".envs/local/sunat";
const filename = directory + "/service.env";
mkdirSync(directory, { recursive: true });
if (!existsSync(filename)) {
  writeFileSync(
    filename,
    "SUNAT_CREDENTIALS_CURRENT_KEY=local\nSUNAT_CREDENTIALS_KEYS=" +
      JSON.stringify({ local: randomBytes(32).toString("hex") }) +
      "\n",
  );
}
const keys = z
  .object({
    SUNAT_CREDENTIALS_CURRENT_KEY: z.string(),
    SUNAT_CREDENTIALS_KEYS: z.string(),
  })
  .parse(parseEnv(readFileSync(filename, "utf8")));
const environment = {
  ...base,
  ...keys,
  TAXSKILL_BUILD_PROFILE: "h10",
  APP_BASE_URL: "http://localhost:4003",
  SUPABASE_URL: "http://host.docker.internal:54431",
  SUNAT_WORKER_MODE: "simulator",
  SUNAT_RUN_DAILY: "false",
};
writeFileSync(
  filename,
  Object.entries(environment)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n") + "\n",
);
const commands: Record<string, string[]> = {
  build: ["build"],
  start: ["start", "-H", "127.0.0.1", "-p", "4003"],
  bundle: ["check:bundle"],
  verify: ["tsx", "scripts/fixtures/h10-continuous-live.mts"],
  "verify:foreground": ["tsx", "scripts/fixtures/h10-live.mts"],
};
const command = commands[process.argv[2] ?? ""];
const yarn = process.env.npm_execpath;
if (!command || !yarn?.endsWith("yarn.js"))
  throw new Error(
    "Usa yarn h10:app build|start|bundle|verify|verify:foreground.",
  );
const child = spawn(process.execPath, [yarn, ...command], {
  stdio: "inherit",
  windowsHide: true,
  env: {
    ...process.env,
    ...environment,
    CIRCLE_NODE_TOTAL: "2",
    RAYON_NUM_THREADS: "2",
  },
});
child.on("error", () => {
  console.error("No se pudo iniciar el laboratorio H10.");
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
