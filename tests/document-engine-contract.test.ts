import { describe, expect, it } from "vitest";

import {
  civilDateSchema,
  engineRequirementSchema,
} from "../src/domain/documents/contracts/engine.schema";

const input = {
  company_id: "40000000-0000-4000-8000-000000000001",
  document_type_id: "40000000-0000-4000-8000-000000000002",
  title: "Regla configurable",
  description: null,
  frequency: "mensual",
  deadline_offset_days: 0,
  priority: "media",
  is_required: true,
  inherit_responsible: true,
  delivery_responsible_id: null,
  allowed_formats: ["pdf"],
  max_file_bytes: 20000000,
  deliverable_specs: [
    {
      position_code: "file_1",
      label: "Archivo requerido",
      display_order: 1,
      allowed_formats: ["pdf"],
      max_file_bytes: 20000000,
    },
  ],
};
describe("H04 configuration boundaries", () => {
  it("keeps a new rule as a draft unless activation is explicit", () => {
    expect(engineRequirementSchema.parse(input).active).toBe(false);
  });
  it.each(["2023-02-29", "2024-02-30", "2026-13-01", "2026-1-01"])(
    "rejects impossible or noncanonical civil date %s",
    (date) => {
      expect(civilDateSchema.safeParse(date).success).toBe(false);
    },
  );
  it("requires all three personalized interval fields", () => {
    expect(
      engineRequirementSchema.safeParse({
        ...input,
        frequency: "personalizada",
        interval_count: 1,
        interval_unit: "months",
      }).success,
    ).toBe(false);
    expect(
      engineRequirementSchema.safeParse({
        ...input,
        frequency: "personalizada",
        interval_count: 1,
        interval_unit: "months",
        anchor_date: "2024-01-31",
      }).success,
    ).toBe(true);
  });
  it("requires an explicit deadline for a single occurrence", () => {
    expect(
      engineRequirementSchema.safeParse({ ...input, frequency: "unica" })
        .success,
    ).toBe(false);
  });
  it("rejects an explicit owner without identity", () => {
    expect(
      engineRequirementSchema.safeParse({
        ...input,
        inherit_responsible: false,
      }).success,
    ).toBe(false);
  });
  it("rejects duplicate delivery position identities", () => {
    expect(
      engineRequirementSchema.safeParse({
        ...input,
        deliverable_specs: [
          input.deliverable_specs[0],
          input.deliverable_specs[0],
        ],
      }).success,
    ).toBe(false);
  });
  it("rejects a position that exceeds its snapshot policy", () => {
    expect(
      engineRequirementSchema.safeParse({ ...input, max_file_bytes: 100 })
        .success,
    ).toBe(false);
  });
  it("requires identified events for eventual rules", () => {
    expect(
      engineRequirementSchema.safeParse({ ...input, frequency: "eventual" })
        .success,
    ).toBe(false);
  });
  it("does not allow company rules to use an employment stage", () => {
    expect(
      engineRequirementSchema.safeParse({
        ...input,
        frequency: "eventual",
        module: "tributario",
        applicability_conditions: {
          schema_version: 1,
          employment_stage: "cese",
          event_types: ["worker_terminated"],
          termination_reasons: [],
        },
      }).success,
    ).toBe(false);
  });
});
