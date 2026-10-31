export const SUNAT_PILOT_CHECK_IDS = [
  "authenticated_access",
  "current_and_previous_month",
  "attachment_matches_source",
  "stable_message_identifiers",
  "session_recovery_and_errors",
  "bounded_month_queries",
  "resource_measurements",
  "read_state_effects",
] as const;

export const SUNAT_PILOT_DIRECTORY = ".envs/local/sunat";
export const SUNAT_PILOT_EXAMPLES = "integrations/sunat";
export const SUNAT_PILOT_REPORT = "test-results/local/h10/preflight.json";
export const SUNAT_PILOT_TIMEZONE = "America/Lima";
export const SUNAT_PILOT_PENDING_EXIT_CODE = 2;
