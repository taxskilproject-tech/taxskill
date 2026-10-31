import type { SunatPilotEvidence } from "../types/pilot.types";

export function sunatPilotResourceBlockers(evidence: SunatPilotEvidence) {
  const { measurements: observed, limits } = evidence;
  const comparisons = [
    ["duration", observed.duration_ms, limits.max_duration_ms],
    ["memory", observed.peak_memory_mb, limits.max_memory_mb],
    ["requests", observed.request_count, limits.max_requests],
    ["pages", observed.pages_read, limits.max_pages],
  ] as const;
  const comparisonsResult = comparisons.flatMap(([name, value, maximum]) => {
    if (value === null || maximum === null || value <= 0)
      return [`${name}_not_measured`];
    return value > maximum ? [`${name}_over_budget`] : [];
  });
  return [
    ...comparisonsResult,
    ...(observed.cpu_time_ms === null ? ["cpu_not_measured"] : []),
    ...(observed.attachment_bytes === null || observed.attachment_bytes <= 0
      ? ["attachment_not_measured"]
      : []),
  ];
}
