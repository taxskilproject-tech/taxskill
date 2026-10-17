import { afterEach, describe, expect, it, vi } from "vitest";

import { isLocalSupabaseUrl } from "@/config/env/utils/is-local-supabase-url";
import { parseAdminEnvironment } from "@/config/env/utils/parse-admin-environment";

import { requireLocalTestEnvironment } from "../scripts/utils/require-local-test-environment";

vi.mock("@next/env", () => ({ loadEnvConfig: vi.fn() }));
afterEach(() => vi.unstubAllEnvs());

describe("aislamiento de pruebas locales", () => {
  it.each([
    "http://127.0.0.1:54331",
    "http://localhost:54331/",
    "http://[::1]:54331",
  ])("permite la API local de Docker: %s", (url) => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
    expect(requireLocalTestEnvironment()).toBe(url);
  });

  it.each([
    undefined,
    "",
    "https://gzwrqvqofcrdjvzoblaz.supabase.co",
    "https://example.supabase.co",
    "http://127.0.0.1:54321",
    "http://192.168.1.5:54331",
    "http://127.0.0.1.example.com:54331",
    "http://localhost:54332",
    "http://localhost:54331/functions/v1",
    "http://user:password@localhost:54331",
    "http://localhost:54331?remote=true",
    "http://localhost:54331#remote",
    "not-a-url",
  ])("rechaza destinos remotos, vacíos o ambiguos: %s", (url) => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
    expect(isLocalSupabaseUrl(url)).toBe(false);
    expect(requireLocalTestEnvironment).toThrow(
      "No se permiten destinos Cloud",
    );
  });

  it("admite service_role legado solo en la API de Docker local", () => {
    const payload = btoa(JSON.stringify({ role: "service_role" }));
    const secret = `fixture.${payload}.not-a-real-signature`;
    expect(
      parseAdminEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54331",
        SUPABASE_SECRET_KEY: secret,
      }).ok,
    ).toBe(true);
    expect(
      parseAdminEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SECRET_KEY: secret,
      }).ok,
    ).toBe(false);
  });
});
