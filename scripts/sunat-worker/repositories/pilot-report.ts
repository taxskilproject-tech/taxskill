import { mkdirSync, renameSync, writeFileSync } from "node:fs";

import type { PilotReport } from "../types/pilot.types";

export function writePilotReport(report: PilotReport): void {
  try {
    mkdirSync("/private/results", { recursive: true });
    writeFileSync(
      "/private/results/connector.pending.json",
      JSON.stringify(report, null, 2),
      { mode: 0o600 },
    );
    renameSync(
      "/private/results/connector.pending.json",
      "/private/results/connector.json",
    );
  } catch {
    throw new Error("PILOT_REPORT_STORE_FAILED");
  }
}
