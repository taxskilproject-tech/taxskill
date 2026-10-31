import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

import { loadH09LabEnvironment } from "./utils/h09-lab-environment";

if (process.argv.length !== 2)
  throw new Error("H10_SQL_ACCEPTS_NO_REMOTE_TARGET");
loadH09LabEnvironment();
const result = spawnSync(
  "docker",
  [
    "--context",
    "desktop-linux",
    "exec",
    "-i",
    "-e",
    "PGOPTIONS=-c taxskill.local_docker_test=h10-dispatch",
    "supabase_db_tax-skill-h09",
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-q",
  ],
  {
    input: readFileSync("supabase/tests/h10-dispatch.sql", "utf8"),
    encoding: "utf8",
    windowsHide: true,
  },
);
if (result.error || result.status !== 0) {
  console.error(result.stderr);
  throw new Error("H10_DISPATCH_SQL_FAILED");
}
const checks = Number(
  result.stderr.match(/H10_DISPATCH_SQL: (\d+) checks passed/)?.[1],
);
if (!checks) throw new Error("H10_SQL_REPORT_MISSING");
writeFileSync(
  "docs/hitos/evidencias/h10-dispatch-sql.json",
  JSON.stringify(
    {
      checked_on: new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Lima",
      }).format(new Date()),
      environment: "isolated_docker_54431",
      checks_passed: checks,
      rollback: true,
      real_sunat_requests: false,
      supabase_cloud_writes: false,
    },
    null,
    2,
  ) + "\n",
);
console.info(
  `H10 dispatcher: ${checks} comprobaciones SQL aprobadas; transacción revertida.`,
);
