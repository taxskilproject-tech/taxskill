import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import { checkMailboxContinuations } from "../sunat-pilot/worker/lab/continuation-checks";
import { checkMailboxEdges } from "../sunat-pilot/worker/lab/edge-checks";
import {
  mailboxLabCheck,
  runMailboxLabScenario,
} from "../sunat-pilot/worker/lab/helpers";
import { checkPartialMailboxRecovery } from "../sunat-pilot/worker/lab/partial-checks";
import { startMailboxLabProvider } from "../sunat-pilot/worker/lab/provider";
import { checkMailboxQueries } from "../sunat-pilot/worker/lab/query-checks";
import { checkMailboxSessions } from "../sunat-pilot/worker/lab/session-checks";
import type { MailboxLabCheck } from "../sunat-pilot/worker/types/lab.types";

async function cgroupNumber(filename: string) {
  const value = (await readFile(filename, "utf8")).trim();
  const measured = Number(value);
  if (!Number.isFinite(measured))
    throw new Error("CGROUP_MEASUREMENT_UNAVAILABLE");
  return measured;
}

async function containerPeakMemoryBytes() {
  const filename = [
    "/sys/fs/cgroup/memory.peak",
    "/sys/fs/cgroup/memory/memory.max_usage_in_bytes",
  ].find(existsSync);
  if (!filename) throw new Error("CGROUP_MEMORY_UNAVAILABLE");
  return cgroupNumber(filename);
}

async function runLab(): Promise<void> {
  if (!existsSync("/.dockerenv") || process.env.TAXSKILL_H10_DOCKER_LAB !== "1")
    throw new Error("ISOLATED_DOCKER_LAB_REQUIRED");
  const started = performance.now();
  const cpuStart = process.cpuUsage();
  const provider = await startMailboxLabProvider();
  const checks: MailboxLabCheck[] = [];
  try {
    checks.push(...(await checkMailboxQueries(provider.origin)));
    checks.push(...(await checkMailboxSessions(provider.origin)));
    checks.push(...(await checkMailboxContinuations(provider.origin)));
    checks.push(...(await checkMailboxEdges(provider.origin)));
    checks.push(...(await checkPartialMailboxRecovery(provider.origin)));
    const measured = (
      await runMailboxLabScenario(provider.origin, "normal", {}, "measured")
    ).result;
    checks.push(
      mailboxLabCheck(
        "worker_measures_actual_local_requests",
        measured.metrics.request_count === 2 &&
          measured.metrics.pages_read === 2,
      ),
    );
    checks.push(
      mailboxLabCheck(
        "worker_measures_cpu_memory_and_time",
        measured.metrics.cpu_time_ms > 0 &&
          measured.metrics.peak_memory_mb > 0 &&
          measured.metrics.duration_ms > 0,
      ),
    );
    const cpu = process.cpuUsage(cpuStart);
    const report = {
      schema_version: 1,
      recorded_at: new Date().toISOString(),
      source: "synthetic",
      environment: "isolated_docker_simulator",
      live_sunat_connector_validated: false,
      network: "none; loopback fixture only",
      checks,
      measurements: {
        suite_duration_ms: Math.ceil(performance.now() - started),
        suite_cpu_time_ms: (cpu.user + cpu.system) / 1000,
        suite_peak_memory_mb: Math.ceil(process.resourceUsage().maxRSS / 1024),
        container_peak_memory_bytes: await containerPeakMemoryBytes(),
        actual_simulator_http_requests: provider.requests(),
        sample_query: measured.metrics,
      },
      budgets: {
        container_memory_mb: 256,
        container_cpus: 0.5,
        per_query_timeout_ms: 5000,
      },
      production_jobs_activated: false,
    };
    await mkdir("/results", { recursive: true });
    await writeFile(
      "/results/worker-lab.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(
      JSON.stringify({ passed: checks.length, failed: 0, live_sunat: false }),
    );
  } finally {
    provider.server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      provider.server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

runLab().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "LOCAL_WORKER_LAB_FAILED",
  );
  process.exitCode = 1;
});
