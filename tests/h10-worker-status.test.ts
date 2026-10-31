import { expect, it } from "vitest";

import { failSunatJob } from "../scripts/sunat-worker/repositories/worker-status";
import { sunatStatusClient } from "./fixtures/sunat-status";
import { sunatWorkerClaimFixture } from "./fixtures/sunat-worker";

it("exige confirmación afirmativa antes de dar por registrado un fallo", async () => {
  const claim = sunatWorkerClaimFixture();
  const { client, requests } = sunatStatusClient({
    finish: false,
    abandon: true,
  });
  await failSunatJob(claim, client, "SOURCE_UNAVAILABLE");
  expect(requests.map((url) => url.pathname)).toEqual([
    "/rest/v1/rpc/h10_worker_finish",
    "/rest/v1/rpc/h10_worker_abandon",
  ]);
});

it.each(["complete", "partial", "cancelled"])(
  "recupera la confirmación perdida sin sobrescribir el estado %s",
  async (retainedState) => {
    const claim = sunatWorkerClaimFixture();
    const { client, requests } = sunatStatusClient({
      finish: false,
      abandon: false,
      retainedState,
    });
    await expect(failSunatJob(claim, client, "ACCESS_REVOKED")).resolves.toBe(
      retainedState,
    );
    const query = requests.at(-1);
    expect(query?.searchParams.get("id")).toBe("eq." + claim.job.id);
    expect(query?.searchParams.get("organization_id")).toBe(
      "eq." + claim.job.organization_id,
    );
    expect(query?.searchParams.get("company_id")).toBe(
      "eq." + claim.job.company_id,
    );
  },
);

it.each(["queued", "running", null])(
  "un fallo sin confirmar permanece explícito: %s",
  async (retainedState) => {
    const { client } = sunatStatusClient({
      finish: false,
      abandon: false,
      retainedState,
    });
    await expect(
      failSunatJob(sunatWorkerClaimFixture(), client, "SOURCE_UNAVAILABLE"),
    ).rejects.toThrow("WORKER_STATUS_UNAVAILABLE");
  },
);

it("un error de consulta no se interpreta como cancelación o persistencia correcta", async () => {
  const { client } = sunatStatusClient({
    finish: false,
    abandon: false,
    queryFails: true,
  });
  await expect(
    failSunatJob(sunatWorkerClaimFixture(), client, "SOURCE_UNAVAILABLE"),
  ).rejects.toThrow("WORKER_STATUS_UNAVAILABLE");
});

it("rechaza códigos que podrían filtrar información antes de solicitar persistencia", async () => {
  const { client, requests } = sunatStatusClient({
    finish: true,
    abandon: true,
  });
  await expect(
    failSunatJob(sunatWorkerClaimFixture(), client, "private fixture detail"),
  ).rejects.toThrow("WORKER_ERROR_CODE_INVALID");
  expect(requests).toHaveLength(0);
});
