const HISTORY_TABLES = [
  "obligations",
  "deliverables",
  "submission_cycles",
  "upload_intents",
  "document_versions",
  "review_events",
  "notification_events",
  "notifications",
  "rule_versions",
  "requirement_rules",
  "workers",
  "employment_periods",
  "audit_events",
];

export function historyFingerprintSql(): string {
  const expressions = HISTORY_TABLES.map(
    (table) =>
      `'${table}',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by t.id)::text,'[]')) from public.${table} t)`,
  );
  return "select jsonb_build_object(" + expressions.join(",") + ")";
}
