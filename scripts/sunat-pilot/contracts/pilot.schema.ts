import { z } from "zod";

import { SUNAT_PILOT_CHECK_IDS } from "../constants/pilot";

const month = z
  .string()
  .regex(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/)
  .nullable();
const text = z.string().trim().min(1).max(200).nullable();
const reference = z
  .string()
  .regex(/^[a-z0-9][a-z0-9_.-]{0,95}$/)
  .nullable();
const measurement = z.number().int().nonnegative().nullable();
const limit = z.number().int().positive().nullable();

// These inputs accept administrative metadata and redacted observations, never credentials.
export const sunatPilotRequestSchema = z.strictObject({
  schema_version: z.literal(1),
  company: z.strictObject({
    company_id: z.uuid().nullable(),
    ruc: z
      .string()
      .regex(/^\d{11}$/)
      .nullable(),
    legal_name: text,
  }),
  authorization: z.strictObject({
    reference,
    approved_by: text,
    approved_at: z.iso.datetime({ offset: true }).nullable(),
    allow_read: z.boolean(),
    allow_download: z.boolean(),
    allow_local_evidence: z.boolean(),
    allow_read_state_change: z.boolean(),
  }),
  months: z.strictObject({ current: month, previous: month }),
  access: z.strictObject({
    sol_user_available: z.boolean(),
    mailbox_permission_confirmed: z.boolean(),
    private_entry_arranged: z.boolean(),
  }),
  references: z.strictObject({
    known_message_available: z.boolean(),
    known_attachment_available: z.boolean(),
  }),
  infrastructure: z.strictObject({
    private_worker_confirmed: z.boolean(),
    maintenance_contact_confirmed: z.boolean(),
  }),
});

const check = z
  .strictObject({
    id: z.enum(SUNAT_PILOT_CHECK_IDS),
    status: z.enum(["pending", "passed", "failed"]),
    evidence_reference: reference,
  })
  .refine(
    (value) => value.status === "pending" || value.evidence_reference !== null,
  );

export const sunatPilotEvidenceSchema = z.strictObject({
  schema_version: z.literal(1),
  environment: z.enum(["not_run", "authorized_browser", "docker_local"]),
  provenance: z.enum(["not_run", "synthetic", "authorized_live"]),
  authorization_reference: reference,
  checks: z
    .array(check)
    .length(SUNAT_PILOT_CHECK_IDS.length)
    .refine(
      (values) =>
        new Set(values.map((value) => value.id)).size ===
        SUNAT_PILOT_CHECK_IDS.length,
    ),
  measurements: z.strictObject({
    duration_ms: measurement,
    peak_memory_mb: measurement,
    cpu_time_ms: measurement,
    request_count: measurement,
    pages_read: measurement,
    attachment_bytes: measurement,
  }),
  limits: z.strictObject({
    max_duration_ms: limit,
    max_memory_mb: limit,
    max_requests: limit,
    max_pages: limit,
  }),
  behavior: z.strictObject({
    month_query: z.enum(["unknown", "source_filter", "bounded_pagination"]),
    unattended_daily_verified: z.boolean(),
    read_state: z.enum(["unknown", "unchanged", "changes_on_access"]),
  }),
});
