import type {
  SunatPilotAssessment,
  SunatPilotEvidence,
  SunatPilotRequest,
  SunatPilotStatus,
} from "../types/pilot.types";
import { missingSunatPilotRequirements } from "./pilot-requirements";
import { sunatPilotResourceBlockers } from "./pilot-resource-blockers";

export function assessSunatPilot(
  request: SunatPilotRequest,
  evidence: SunatPilotEvidence,
  now: Date,
): SunatPilotAssessment {
  const missing = missingSunatPilotRequirements(request, now);
  const failed = evidence.checks
    .filter((check) => check.status === "failed")
    .map((check) => check.id);
  const incomplete = evidence.checks
    .filter((check) => check.status === "pending")
    .map((check) => check.id);
  const verifications = [
    ["own_worker_not_validated", evidence.environment === "docker_local"],
    [
      "authorization_mismatch",
      evidence.authorization_reference === request.authorization.reference,
    ],
    ["month_query_unverified", evidence.behavior.month_query !== "unknown"],
    ["daily_query_unverified", evidence.behavior.unattended_daily_verified],
    ["read_state_unverified", evidence.behavior.read_state !== "unknown"],
    [
      "read_state_change_not_authorized",
      evidence.behavior.read_state !== "changes_on_access" ||
        request.authorization.allow_read_state_change,
    ],
  ] as const;
  const blockers = [
    ...sunatPilotResourceBlockers(evidence),
    ...verifications.filter(([, verified]) => !verified).map(([code]) => code),
  ];
  let status: SunatPilotStatus = "ready_for_implementation_review";
  if (failed.length || blockers.length || incomplete.length)
    status = "pilot_incomplete";
  if (failed.length) status = "pilot_failed";
  if (evidence.provenance !== "authorized_live")
    status = "awaiting_live_evidence";
  if (missing.length) status = "awaiting_administrator";
  return {
    schema_version: 1,
    assessed_at: now.toISOString(),
    status,
    missing_requirements: missing,
    incomplete_checks: incomplete,
    failed_checks: failed,
    technical_blockers: blockers,
    production_prerequisites: [
      ...(request.infrastructure.private_worker_confirmed
        ? []
        : ["private_worker_capacity"]),
      ...(request.company.company_id ? [] : ["company_mapping"]),
      ...(request.infrastructure.maintenance_contact_confirmed
        ? []
        : ["maintenance_contact"]),
    ],
    source: evidence.provenance,
    environment: evidence.environment,
    measurements: evidence.measurements,
    limits: evidence.limits,
    assessment_only: true,
    network_requests_performed: false,
    requires_human_evidence_review: true,
  };
}
