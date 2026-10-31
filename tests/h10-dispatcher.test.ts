import { createHmac } from "node:crypto";
import { APIError } from "@vercel/sandbox";
import { beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";

import { sunatDispatchEnvelopeSchema } from "../src/features/sunat-mailbox/contracts/dispatch.schema";
import { executeSunatSandbox } from "../src/features/sunat-mailbox/services/dispatch-sandbox.server";
import { hasSunatDispatchAuthorization } from "../src/features/sunat-mailbox/utils/dispatch-auth";
import { sunatDispatchFixture } from "./fixtures/sunat-dispatch";
import type { VercelSandboxModule } from "./types/sunat-dispatch.types";

const runtime = vi.hoisted(() => ({
  create: vi.fn(),
  get: vi.fn(),
  stop: vi.fn(),
  update: vi.fn(),
  writeFiles: vi.fn(),
  runCommand: vi.fn(),
  wait: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@vercel/sandbox", async () => {
  const original =
    await vi.importActual<VercelSandboxModule>("@vercel/sandbox");
  return { ...original, Sandbox: { create: runtime.create, get: runtime.get } };
});
vi.mock("../src/config/env/server-env.server", () => ({
  getAdminEnvironment: () => ({
    ok: true,
    data: { supabaseUrl: "http://127.0.0.1:54431", secretKey: "fixture-only" },
  }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  runtime.stop.mockResolvedValue({});
  runtime.update.mockResolvedValue(undefined);
  runtime.writeFiles.mockResolvedValue(undefined);
  runtime.wait.mockResolvedValue({ exitCode: 0 });
  runtime.runCommand.mockResolvedValue({ wait: runtime.wait });
  runtime.get.mockResolvedValue({ status: "stopped", persistent: false });
  runtime.create.mockResolvedValue({
    name: "fixture-sandbox",
    persistent: false,
    writeFiles: runtime.writeFiles,
    runCommand: runtime.runCommand,
    stop: runtime.stop,
    update: runtime.update,
  });
});

it("ejecuta un trabajo con recursos acotados y credenciales cifradas, sin snapshots", async () => {
  const input = sunatDispatchFixture();
  await executeSunatSandbox(input);
  expect(runtime.create).toHaveBeenCalledWith(
    expect.objectContaining({
      persistent: false,
      timeout: 240000,
      resources: { vcpus: 1 },
      ports: [],
      networkPolicy: { allow: ["sunat.gob.pe", "*.sunat.gob.pe", "127.0.0.1"] },
    }),
  );
  expect(runtime.runCommand).toHaveBeenCalledWith(
    expect.objectContaining({
      args: ["-a", "node", "/app/build/scripts/sunat-worker/run-one.js"],
      timeoutMs: 200000,
    }),
  );
  expect(runtime.runCommand).toHaveBeenCalledTimes(1);
  expect(runtime.runCommand).not.toHaveBeenCalledWith(
    expect.objectContaining({ sudo: true }),
  );
  const files = z
    .array(
      z.object({ path: z.string(), mode: z.literal(384), content: z.string() }),
    )
    .parse(runtime.writeFiles.mock.calls[0]?.[0]);
  expect(files.map((file) => file.path)).toEqual([
    "/private/claim.json",
    "/private/runtime.json",
  ]);
  const claimFile = files.find(
    (file) => file.path === "/private/claim.json",
  )?.content;
  expect(claimFile).not.toContain("fixture-only");
  expect(claimFile).not.toContain('"password"');
  expect(runtime.stop).toHaveBeenCalledTimes(1);
  expect(runtime.get).toHaveBeenCalledWith(
    expect.objectContaining({ resume: false }),
  );
  expect(input.requests).toEqual([
    expect.objectContaining({ p_stopped: true, p_error_code: "" }),
  ]);
});

it("una salida no nula no se presenta como ejecución correcta y siempre cierra la VM", async () => {
  runtime.wait.mockResolvedValue({ exitCode: 1 });
  const input = sunatDispatchFixture();
  await executeSunatSandbox(input);
  expect(runtime.stop).toHaveBeenCalledTimes(1);
  expect(input.requests).toEqual([
    expect.objectContaining({
      p_stopped: true,
      p_error_code: "SANDBOX_EXECUTION_FAILED",
    }),
  ]);
});

it("un cierre no confirmado conserva el bloqueo global", async () => {
  runtime.stop.mockRejectedValue(new Error("fixture stop failed"));
  const input = sunatDispatchFixture();
  await executeSunatSandbox(input);
  expect(input.requests).toEqual([
    expect.objectContaining({
      p_stopped: false,
      p_error_code: "SANDBOX_CLEANUP_FAILED",
    }),
  ]);
});

it("rechaza persistencia inesperada antes de enviar claves y la desactiva para cerrar", async () => {
  runtime.create.mockResolvedValue({
    name: "fixture-sandbox",
    persistent: true,
    stop: runtime.stop,
    update: runtime.update,
  });
  const input = sunatDispatchFixture();
  await executeSunatSandbox(input);
  expect(runtime.writeFiles).not.toHaveBeenCalled();
  expect(runtime.update).toHaveBeenCalledWith(
    { persistent: false },
    expect.anything(),
  );
  expect(input.requests).toEqual([
    expect.objectContaining({
      p_stopped: true,
      p_error_code: "SANDBOX_EXECUTION_FAILED",
    }),
  ]);
});

it("busca y cierra por nombre una creación cuya respuesta se perdió", async () => {
  runtime.create.mockRejectedValue(new Error("fixture lost response"));
  runtime.get
    .mockResolvedValueOnce({
      name: "fixture-sandbox",
      persistent: false,
      stop: runtime.stop,
    })
    .mockResolvedValueOnce({ status: "stopped", persistent: false });
  const input = sunatDispatchFixture();
  await executeSunatSandbox(input);
  expect(runtime.writeFiles).not.toHaveBeenCalled();
  expect(runtime.stop).toHaveBeenCalledTimes(1);
  expect(input.requests).toEqual([
    expect.objectContaining({ p_stopped: true }),
  ]);
});

it("una creación incierta sin respuesta verificable no libera el lease", async () => {
  runtime.create.mockRejectedValue(new Error("fixture network failure"));
  runtime.get.mockRejectedValue(new Error("fixture lookup failure"));
  const input = sunatDispatchFixture();
  await executeSunatSandbox(input);
  expect(runtime.writeFiles).not.toHaveBeenCalled();
  expect(input.requests).toEqual([
    expect.objectContaining({
      p_stopped: false,
      p_error_code: "SANDBOX_CLEANUP_FAILED",
    }),
  ]);
});

it("informa el límite del proveedor y confirma que no existe una VM residual", async () => {
  runtime.create.mockRejectedValue(
    new APIError(new Response(null, { status: 402 })),
  );
  runtime.get.mockRejectedValue(
    new APIError(new Response(null, { status: 404 })),
  );
  const input = sunatDispatchFixture();
  await executeSunatSandbox(input);
  expect(input.requests).toEqual([
    expect.objectContaining({
      p_stopped: true,
      p_error_code: "SANDBOX_QUOTA_EXCEEDED",
    }),
  ]);
});

it("verifica la firma ligada a nonce, acción y fecha, con caducidad acotada", () => {
  const secret = "ab".repeat(32);
  const envelope = {
    schema_version: 1,
    action: "sunat.dispatch",
    nonce: "05ded810-8bc1-4192-a205-eeaa1889929a",
    issued_at: 1793400000,
  };
  const parsed = sunatDispatchEnvelopeSchema.parse(envelope);
  const signature = createHmac("sha256", secret)
    .update(`v1:${parsed.nonce}:${parsed.issued_at}:sunat.dispatch`)
    .digest("hex");
  expect(
    hasSunatDispatchAuthorization(signature, parsed, secret, parsed.issued_at),
  ).toBe(true);
  expect(
    hasSunatDispatchAuthorization(
      signature,
      parsed,
      secret,
      parsed.issued_at + 91,
    ),
  ).toBe(false);
  expect(
    hasSunatDispatchAuthorization(
      signature,
      parsed,
      secret,
      parsed.issued_at - 91,
    ),
  ).toBe(false);
  expect(
    hasSunatDispatchAuthorization(
      signature,
      { ...parsed, issued_at: parsed.issued_at + 1 },
      secret,
      parsed.issued_at,
    ),
  ).toBe(false);
  expect(
    hasSunatDispatchAuthorization(
      signature,
      parsed,
      "cd".repeat(32),
      parsed.issued_at,
    ),
  ).toBe(false);
  expect(
    hasSunatDispatchAuthorization(null, parsed, secret, parsed.issued_at),
  ).toBe(false);
  expect(
    hasSunatDispatchAuthorization(
      "Bearer " + secret,
      parsed,
      secret,
      parsed.issued_at,
    ),
  ).toBe(false);
  expect(
    sunatDispatchEnvelopeSchema.safeParse({ ...parsed, company_id: "hidden" })
      .success,
  ).toBe(false);
});
