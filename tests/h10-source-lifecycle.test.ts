import { expect, it, vi } from "vitest";

import { MailboxError } from "../scripts/sunat-pilot/worker/services/mailbox-error";
import { OfficialSunatSource } from "../scripts/sunat-worker/source/sunat-source";
import type { SourceOptions } from "../scripts/sunat-worker/types/source.types";
import type { SunatCredentialPayload } from "../src/domain/sunat/types/credentials.types";

const session = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock("../scripts/sunat-worker/source/browser-session", () => ({
  openSunatSession: session.open,
}));
const credentials: SunatCredentialPayload = {
  ruc: "20000000001",
  username: "fixture",
  password: "fixture-only",
};

it("cerrar mientras espera un reintento impide volver a enviar accesos", async () => {
  vi.useFakeTimers();
  session.open
    .mockReset()
    .mockRejectedValue(new MailboxError("SOURCE_UNAVAILABLE"));
  const source = new OfficialSunatSource();
  const connecting = source.connect(credentials).then(
    () => null,
    (error) => error,
  );
  try {
    await vi.advanceTimersByTimeAsync(0);
    await source.close();
    expect(await connecting).toMatchObject({ code: "SESSION_EXPIRED" });
    expect(session.open).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});

it("la renovación respeta la cancelación y cierra el navegador que estaba abriendo", async () => {
  const opened = Promise.withResolvers<void>();
  const blocked = Promise.withResolvers<void>();
  const close = vi.fn(async () => blocked.reject(new Error("fixture closed")));
  session.open
    .mockReset()
    .mockResolvedValueOnce({
      browser: { close: async () => undefined },
      page: { url: () => "https://e-menu.sunat.gob.pe/" },
    })
    .mockImplementation(
      async (_input: SunatCredentialPayload, options: SourceOptions) => {
        await options.onBrowser?.({ close });
        opened.resolve();
        await blocked.promise;
      },
    );
  const source = new OfficialSunatSource();
  await source.connect(credentials);
  const controller = new AbortController();
  const renewal = source.renewSession(controller.signal);
  await opened.promise;
  controller.abort();
  await expect(renewal).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
  expect(close).toHaveBeenCalledTimes(1);
});

it("cierra el navegador mientras se está inicializando y no solo después del login", async () => {
  const opened = Promise.withResolvers<void>();
  const blocked = Promise.withResolvers<void>();
  const close = vi.fn(async () => {
    blocked.reject(new Error("fixture closed"));
  });
  session.open.mockImplementation(
    async (_input: SunatCredentialPayload, options: SourceOptions) => {
      await options.onBrowser?.({ close });
      opened.resolve();
      await blocked.promise;
      throw new Error("UNREACHABLE_FIXTURE");
    },
  );
  const source = new OfficialSunatSource();
  const connecting = source.connect(credentials).then(
    () => "unexpected_success",
    () => "closed",
  );
  await opened.promise;
  await source.close();
  expect(await connecting).toBe("closed");
  expect(close).toHaveBeenCalledTimes(1);
});

it("un navegador creado después de cancelar no puede publicar una sesión tardía", async () => {
  const launch = Promise.withResolvers<void>();
  const close = vi.fn(async () => undefined);
  session.open.mockImplementation(
    async (_input: SunatCredentialPayload, options: SourceOptions) => {
      await launch.promise;
      await options.onBrowser?.({ close });
      throw new Error("UNREACHABLE_FIXTURE");
    },
  );
  const source = new OfficialSunatSource();
  const connecting = source.connect(credentials).then(
    () => "unexpected_success",
    (error: unknown) =>
      error instanceof Error ? error.message : "UNKNOWN_FAILURE",
  );
  await source.close();
  launch.resolve();
  expect(await connecting).toBe("SESSION_EXPIRED");
  expect(close).toHaveBeenCalledTimes(1);
});
