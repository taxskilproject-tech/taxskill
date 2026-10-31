import { existsSync, readFileSync } from "node:fs";

import type { ContainerMetrics } from "../types/pilot.types";

function cpuTime(): number | null {
  const filename = "/sys/fs/cgroup/cpu.stat";
  if (existsSync(filename)) {
    const value = readFileSync(filename, "utf8").match(
      /^usage_usec\s+(\d+)$/m,
    )?.[1];
    if (value) return Number(value) / 1000;
  }
  const legacy = "/sys/fs/cgroup/cpuacct/cpuacct.usage";
  return existsSync(legacy)
    ? Number(readFileSync(legacy, "utf8").trim()) / 1000000
    : null;
}

export function containerMetrics(): ContainerMetrics {
  const filename = [
    "/sys/fs/cgroup/memory.peak",
    "/sys/fs/cgroup/memory/memory.max_usage_in_bytes",
  ].find((path) => existsSync(path));
  const memory = filename
    ? Number(readFileSync(filename, "utf8").trim())
    : null;
  return {
    peak_memory_mb:
      memory !== null && Number.isFinite(memory) ? memory / 1048576 : null,
    cpu_time_ms: cpuTime(),
  };
}
