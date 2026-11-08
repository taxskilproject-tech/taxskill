const FOLLOWUP_KEYS = new Set([
  "assistant_id",
  "document_month",
  "document_view",
]);

export function legacyReportingInput(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([key]) => !FOLLOWUP_KEYS.has(key)),
  );
}
