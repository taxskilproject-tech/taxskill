import { expect, it } from "vitest";

import type { JobHealth } from "@/features/operations/types/health-evaluation.types";
import { evaluateOperationsHealth } from "@/features/operations/utils/evaluate-operations-health";

import { healthyOperations, operationNow } from "./fixtures/operations";

it("exige el inventario completo incluso si cleanup funciona", () => {
  const snapshot = healthyOperations();
  snapshot.jobs = snapshot.jobs.filter(
    (job) => job.name === "h03-staging-cleanup",
  );
  const result = evaluateOperationsHealth({
    snapshot,
    mode: "production",
    now: operationNow,
  });
  expect(result.status).toBe("degraded");
  expect(result.issues).toEqual([
    { code: "JOB_MISSING", job: "h08-generation" },
    { code: "JOB_MISSING", job: "h06-notifications-dispatch" },
  ]);
});
it("acepta los procesos completos y recientes", () => {
  expect(
    evaluateOperationsHealth({
      snapshot: healthyOperations(),
      mode: "production",
      now: operationNow,
    }).status,
  ).toBe("healthy");
});
it("identifica una suspensión explícita sin presentarla como producción sana", () => {
  const snapshot = healthyOperations();
  snapshot.jobs = snapshot.jobs.filter(
    (job) => job.name === "h03-staging-cleanup",
  );
  expect(
    evaluateOperationsHealth({
      snapshot,
      mode: "prepublication",
      now: operationNow,
    }),
  ).toEqual({ status: "paused", mode: "prepublication", issues: [] });
});
it.each([
  [{ active: false }, "JOB_DISABLED"],
  [{ last_started_at: null }, "JOB_NEVER_RAN"],
  [{ last_status: "failed" }, "JOB_FAILED"],
  [{ last_started_at: "2026-10-19T14:00:00Z" }, "JOB_STALLED"],
  [{ last_started_at: "not-a-date" }, "JOB_INVALID_TIME"],
] satisfies readonly (readonly [Partial<JobHealth>, string])[])(
  "detecta el proceso %o",
  (changes, code) => {
    const snapshot = healthyOperations();
    snapshot.jobs = snapshot.jobs.map((job) =>
      job.name === "h08-generation" ? { ...job, ...changes } : job,
    );
    expect(
      evaluateOperationsHealth({
        snapshot,
        mode: "production",
        now: operationNow,
      }).issues,
    ).toContainEqual({ code, job: "h08-generation" });
  },
);
it.each(["generation_pending_since", "deadline_pending_since"] as const)(
  "detecta ausencia de avance funcional en %s aunque Cron tenga éxito",
  (key) => {
    const snapshot = {
      ...healthyOperations(),
      [key]: "2026-10-19T14:00:00Z",
    };
    const result = evaluateOperationsHealth({
      snapshot,
      mode: "production",
      now: operationNow,
    });
    expect(result.status).toBe("degraded");
    expect(result.issues).toContainEqual({
      code:
        key === "generation_pending_since"
          ? "GENERATION_NO_PROGRESS"
          : "DEADLINES_NO_PROGRESS",
    });
  },
);
it("no alerta sobre trabajo que sí está progresando", () => {
  const snapshot = {
    ...healthyOperations(),
    generation_pending_since: "2026-10-19T14:55:00Z",
  };
  expect(
    evaluateOperationsHealth({
      snapshot,
      mode: "production",
      now: operationNow,
    }).status,
  ).toBe("healthy");
});
it("mantiene los errores funcionales visibles en prepublicación", () => {
  const snapshot = { ...healthyOperations(), automation_failures: 1 };
  expect(
    evaluateOperationsHealth({
      snapshot,
      mode: "prepublication",
      now: operationNow,
    }).issues,
  ).toContainEqual({ code: "AUTOMATION_FAILED" });
});
