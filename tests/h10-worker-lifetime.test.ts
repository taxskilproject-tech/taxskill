import { expect, it, vi } from "vitest";

import {
  WORKER_CLEANUP_TIMEOUT_MS,
  WORKER_JOB_TIMEOUT_MS,
} from "../scripts/sunat-worker/constants/runtime";
import { runClaimedSunatJob } from "../scripts/sunat-worker/services/run-job";
import { sunatRuntimeFixture } from "./fixtures/sunat-runtime";

it("termina por plazo aunque el conector no resuelva ni rechace al cerrarlo", async () => {
  vi.useFakeTimers();
  const fixture = sunatRuntimeFixture();
  const running = runClaimedSunatJob(fixture.claim, fixture, fixture.keys);
  try {
    await vi.advanceTimersByTimeAsync(WORKER_JOB_TIMEOUT_MS);
    await expect(running).resolves.toBe("failed");
    expect(fixture.closeCount()).toBe(1);
    const count = fixture.requests.length;
    fixture.connection.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(fixture.requests).toHaveLength(count);
  } finally {
    fixture.connection.resolve();
    vi.useRealTimers();
  }
});

it("retira el acceso de una conexión pendiente sin esperar que esta termine", async () => {
  vi.useFakeTimers();
  const fixture = sunatRuntimeFixture({ heartbeat: false });
  const running = runClaimedSunatJob(fixture.claim, fixture, fixture.keys);
  try {
    await vi.advanceTimersByTimeAsync(20000);
    await expect(running).resolves.toBe("failed");
    expect(fixture.closeCount()).toBe(1);
  } finally {
    fixture.connection.resolve();
    vi.useRealTimers();
  }
});

it("informa el fallo de limpieza sin una promesa rechazada fuera de control", async () => {
  const fixture = sunatRuntimeFixture({ connected: true, closeFails: true });
  await expect(
    runClaimedSunatJob(fixture.claim, fixture, fixture.keys),
  ).rejects.toThrow("WORKER_CLEANUP_FAILED");
  expect(fixture.closeCount()).toBe(1);
});

it("la limpieza bloqueada también tiene un límite y no deja temporizadores activos", async () => {
  vi.useFakeTimers();
  const fixture = sunatRuntimeFixture({ connected: true, closeHangs: true });
  const running = runClaimedSunatJob(fixture.claim, fixture, fixture.keys).then(
    () => "unexpected_success",
      (error: unknown) => error instanceof Error ? error.message : "UNKNOWN_FAILURE",
  );
  try {
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(WORKER_CLEANUP_TIMEOUT_MS);
    expect(await running).toBe("WORKER_CLEANUP_FAILED");
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});
