import type { z } from "zod";

import type {
  sunatPilotEvidenceSchema,
  sunatPilotRequestSchema,
} from "../contracts/pilot.schema";

export type SunatPilotRequest = z.infer<typeof sunatPilotRequestSchema>;
export type SunatPilotEvidence = z.infer<typeof sunatPilotEvidenceSchema>;
export type SunatPilotStatus =
  | "awaiting_administrator"
  | "awaiting_live_evidence"
  | "pilot_failed"
  | "pilot_incomplete"
  | "ready_for_implementation_review";

export interface SunatPilotAssessment {
  schema_version: 1;
  assessed_at: string;
  status: SunatPilotStatus;
  missing_requirements: string[];
  incomplete_checks: string[];
  failed_checks: string[];
  technical_blockers: string[];
  production_prerequisites: string[];
  source: SunatPilotEvidence["provenance"];
  environment: SunatPilotEvidence["environment"];
  measurements: SunatPilotEvidence["measurements"];
  limits: SunatPilotEvidence["limits"];
  assessment_only: true;
  network_requests_performed: false;
  requires_human_evidence_review: true;
}

export interface SunatPilotFiles {
  request: SunatPilotRequest;
  evidence: SunatPilotEvidence;
}
