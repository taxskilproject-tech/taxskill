import { afterEach, expect, it, vi } from "vitest";

import { MailboxError } from "../scripts/sunat-pilot/worker/services/mailbox-error";
import { SUNAT_LOGIN_RETRY_DELAY_MS } from "../scripts/sunat-worker/constants/source";
import { retrySunatConnection } from "../scripts/sunat-worker/services/retry-connection";

afterEach(() => vi.useRealTimers());

it("recupera un fallo transitorio con una nueva conexión y un único reintento", async () => {
  vi.useFakeTimers();
  const connect = vi
    .fn()
    .mockRejectedValueOnce(new MailboxError("SOURCE_UNAVAILABLE"))
    .mockResolvedValue("connected");
  const result = retrySunatConnection(connect, new AbortController().signal);
  await vi.advanceTimersByTimeAsync(SUNAT_LOGIN_RETRY_DELAY_MS - 1);
  expect(connect).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  await expect(result).resolves.toBe("connected");
  expect(connect).toHaveBeenCalledTimes(2);
});

it("no entra en un bucle de login cuando SUNAT sigue sin responder", async () => {
  vi.useFakeTimers();
  const connect = vi
    .fn()
    .mockRejectedValue(new MailboxError("SOURCE_UNAVAILABLE"));
  const result = retrySunatConnection(
    connect,
    new AbortController().signal,
  ).then(
    () => null,
    (error) => error,
  );
  await vi.advanceTimersByTimeAsync(SUNAT_LOGIN_RETRY_DELAY_MS * 3);
  expect(await result).toMatchObject({ code: "SOURCE_UNAVAILABLE" });
  expect(connect).toHaveBeenCalledTimes(2);
  expect(vi.getTimerCount()).toBe(0);
});

it.each([
  "CREDENTIAL_REJECTED",
  "VERIFICATION_REQUIRED",
  "UNEXPECTED_RESPONSE",
  "SESSION_EXPIRED",
] as const)("se detiene sin reintentar ante %s", async (code) => {
  const connect = vi.fn().mockRejectedValue(new MailboxError(code));
  await expect(
    retrySunatConnection(connect, new AbortController().signal),
  ).rejects.toMatchObject({ code });
  expect(connect).toHaveBeenCalledOnce();
});

it("cancelar durante la espera elimina el timer y evita otro envío de accesos", async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  const connect = vi
    .fn()
    .mockRejectedValue(new MailboxError("SOURCE_UNAVAILABLE"));
  const result = retrySunatConnection(connect, controller.signal).then(
    () => null,
    (error) => error,
  );
  await vi.advanceTimersByTimeAsync(0);
  controller.abort();
  expect(await result).toMatchObject({ code: "BUDGET_EXHAUSTED" });
  expect(connect).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

it("la cancelación termina una conexión que no resuelve y evita reintentar", async () => {
  const controller = new AbortController();
  const pending = Promise.withResolvers<string>();
  const connect = vi.fn(() => pending.promise);
  const result = retrySunatConnection(connect, controller.signal);
  controller.abort();
  await expect(result).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
  pending.resolve("late");
  expect(connect).toHaveBeenCalledOnce();
});

it("no abre ningún navegador cuando ya se ha cancelado la operación", async () => {
  const controller = new AbortController();
  controller.abort();
  const connect = vi.fn();
  await expect(
    retrySunatConnection(connect, controller.signal),
  ).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
  expect(connect).not.toHaveBeenCalled();
});
