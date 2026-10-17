import { describe, expect, it } from "vitest";

import type { SubmissionCycle } from "@/domain/documents/types/document.types";
import {
  aggregateReview,
  operationalDueDate,
  wasSubmittedOnTime,
} from "@/domain/documents/utils/document-status";

const cycle: SubmissionCycle = {
  id: "cycle",
  deliverable_id: "slot",
  cycle_number: 1,
  reason: "initial",
  due_date: "2026-10-15",
  state: "submitted",
  first_submitted_at: "2026-10-16T04:59:59Z",
};
describe("documentary status", () => {
  it("keeps partial approval incomplete", () =>
    expect(
      aggregateReview([
        { review_state: "aprobado" },
        { review_state: "por_revisar" },
      ]),
    ).toBe("por_revisar"));
  it("prioritizes observation over missing delivery", () =>
    expect(
      aggregateReview([
        { review_state: "observado" },
        { review_state: "pendiente" },
      ]),
    ).toBe("observado"));
  it("requires every position approved", () =>
    expect(
      aggregateReview([
        { review_state: "aprobado" },
        { review_state: "aprobado" },
      ]),
    ).toBe("aprobado"));
  it("disposition overrides approval", () =>
    expect(aggregateReview([{ review_state: "aprobado" }], "no_aplica")).toBe(
      "no_aplica",
    ));
  it("removes delivery deadline after receipt", () =>
    expect(operationalDueDate([cycle])).toBeNull());
  it("uses only the open correction deadline", () =>
    expect(
      operationalDueDate([
        { ...cycle, state: "closed" },
        {
          ...cycle,
          id: "correction",
          cycle_number: 2,
          state: "open",
          first_submitted_at: null,
          due_date: "2026-10-20",
        },
      ]),
    ).toBe("2026-10-20"));
  it("closes the deadline at the end of the Lima day", () =>
    expect(wasSubmittedOnTime(cycle)).toBe(true));
  it("preserves late receipt independently of approval", () =>
    expect(
      wasSubmittedOnTime({
        ...cycle,
        first_submitted_at: "2026-10-16T05:00:00Z",
      }),
    ).toBe(false));
});
