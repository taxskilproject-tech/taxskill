import { SUNAT_PILOT_CHECK_IDS } from "../../scripts/sunat-pilot/constants/pilot";
import {
  sunatPilotEvidenceSchema,
  sunatPilotRequestSchema,
} from "../../scripts/sunat-pilot/contracts/pilot.schema";

// Synthetic observations exercise the evaluator, not a connection to SUNAT.
export function sunatPilotRequestFixture() {
  return sunatPilotRequestSchema.parse({
    schema_version: 1,
    company: {
      company_id: null,
      ruc: "20000000001",
      legal_name: "Fixture local",
    },
    authorization: {
      reference: "fixture-authorization",
      approved_by: "Fixture operator",
      approved_at: "2026-10-25T09:00:00-05:00",
      allow_read: true,
      allow_download: true,
      allow_local_evidence: true,
      allow_read_state_change: false,
    },
    months: { current: "2026-10", previous: "2026-09" },
    access: {
      sol_user_available: true,
      mailbox_permission_confirmed: true,
      private_entry_arranged: true,
    },
    references: {
      known_message_available: true,
      known_attachment_available: true,
    },
    infrastructure: {
      private_worker_confirmed: false,
      maintenance_contact_confirmed: true,
    },
  });
}

export function sunatPilotEvidenceFixture() {
  return sunatPilotEvidenceSchema.parse({
    schema_version: 1,
    environment: "docker_local",
    provenance: "synthetic",
    authorization_reference: "fixture-authorization",
    checks: SUNAT_PILOT_CHECK_IDS.map((id) => ({
      id,
      status: "passed",
      evidence_reference: "fixture-evidence",
    })),
    measurements: {
      duration_ms: 1000,
      peak_memory_mb: 100,
      cpu_time_ms: 100,
      request_count: 5,
      pages_read: 2,
      attachment_bytes: 1200,
    },
    limits: {
      max_duration_ms: 5000,
      max_memory_mb: 200,
      max_requests: 10,
      max_pages: 5,
    },
    behavior: {
      month_query: "source_filter",
      unattended_daily_verified: true,
      read_state: "unchanged",
    },
  });
}

export function sunatPilotFailedSessionFixture() {
  const evidence = sunatPilotEvidenceFixture();
  return sunatPilotEvidenceSchema.parse({
    ...evidence,
    provenance: "authorized_live",
    checks: evidence.checks.map((check) =>
      check.id === "session_recovery_and_errors"
        ? { ...check, status: "failed" }
        : check,
    ),
  });
}

export function sunatPilotMissingReferencesFixture() {
  const evidence = sunatPilotEvidenceFixture();
  return {
    ...evidence,
    checks: evidence.checks.map((check) => ({
      ...check,
      evidence_reference: null,
    })),
  };
}
