import { expect, it } from "vitest";

import { parseAdminEnvironment } from "@/config/env/utils/parse-admin-environment";
import { parsePublicEnvironment } from "@/config/env/utils/parse-environment";

import { publicEnvironment } from "./fixtures/scopes";

it("acepta configuración pública y rechaza una credencial de servidor en el navegador", () => {
  expect(parsePublicEnvironment(publicEnvironment).ok).toBe(true);
  expect(
    parsePublicEnvironment({
      ...publicEnvironment,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_h01_test_not_a_real_key",
    }).ok,
  ).toBe(false);
});

it("informa ausencia de configuración sin incluir los valores recibidos", () => {
  const result = parsePublicEnvironment({
    NEXT_PUBLIC_SUPABASE_URL: "https://usuario:clave@example.supabase.co",
  });
  expect(result.ok).toBe(false);
  expect(JSON.stringify(result)).not.toContain("usuario:clave");
  expect(JSON.stringify(result)).toContain("NEXT_PUBLIC_SUPABASE_URL");
});

it.each([
  "http://example.supabase.co",
  "https://example.supabase.co/path",
  "https://example.supabase.co?token=secret",
  "not-a-url",
])("rechaza URL remota insegura o ambigua: %s", (url) => {
  expect(
    parsePublicEnvironment({
      ...publicEnvironment,
      NEXT_PUBLIC_SUPABASE_URL: url,
    }).ok,
  ).toBe(false);
});

it("permite Supabase local y mantiene opcional la configuración administrativa hasta su uso", () => {
  expect(
    parsePublicEnvironment({
      ...publicEnvironment,
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    }).ok,
  ).toBe(true);
  expect(parseAdminEnvironment({}).ok).toBe(false);
});
