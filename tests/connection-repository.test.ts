import { afterEach, expect, it, vi } from "vitest";

import { checkSupabaseConnection } from "@/features/setup/repositories/connection.repository";

import { publicEnvironment } from "./fixtures/scopes";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function configureEnvironment() {
  vi.stubEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    publicEnvironment.NEXT_PUBLIC_SUPABASE_URL,
  );
  vi.stubEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    publicEnvironment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

it("comprueba solo salud pública con timeout y cancelación, sin leer tablas", async () => {
  configureEnvironment();
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  const controller = new AbortController();
  const result = await checkSupabaseConnection(controller.signal);
  expect(result.ok).toBe(true);
  expect(fetchMock.mock.calls[0]?.[0].pathname).toBe("/auth/v1/health");
  expect(fetchMock.mock.calls[0]?.[1].cache).toBe("no-store");
  expect(fetchMock.mock.calls[0]?.[1].headers.apikey).toBe(
    publicEnvironment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
});

it("rechazo HTTP y fallo de red devuelven errores sanitizados", async () => {
  configureEnvironment();
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response("secret", { status: 503 }))
    .mockRejectedValueOnce(new Error("token=secreto"));
  vi.stubGlobal("fetch", fetchMock);
  const result = await checkSupabaseConnection(new AbortController().signal);
  const second = await checkSupabaseConnection(new AbortController().signal);
  expect(result.ok).toBe(false);
  expect(second.ok).toBe(false);
  expect(JSON.stringify(second)).not.toContain("secreto");
});

it("no inicia red si la configuración está incompleta", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  expect((await checkSupabaseConnection(new AbortController().signal)).ok).toBe(
    false,
  );
  expect(fetchMock).not.toHaveBeenCalled();
});
