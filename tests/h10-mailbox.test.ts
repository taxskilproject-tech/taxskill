import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";

import { canReadSunat } from "@/domain/sunat/utils/access";
import { companyChangeDestination } from "@/features/auth/utils/company-navigation";
import { safeReturnTo } from "@/features/auth/utils/safe-return-to";
import { workspaceNavigation } from "@/features/auth/utils/workspace-navigation";
import { workspaceRoute } from "@/features/auth/utils/workspace-route";
import {
  decryptSunatCredentials,
  encryptSunatCredentials,
  parseSunatKeyring,
} from "@/features/sunat-mailbox/services/credentials-crypto.server";
import {
  parseSunatFilters,
  sunatFilterDestination,
} from "@/features/sunat-mailbox/utils/filters";

import { SimulatorSunatSource } from "../scripts/sunat-worker/source/simulator-source";
import {
  attachmentFromLink,
  isOfficialSunatUrl,
  sourceDate,
  validatedSourceFile,
} from "../scripts/sunat-worker/utils/source-validation";
import {
  moduleCompanyA,
  moduleCompanyB,
  moduleContext,
} from "./fixtures/module-navigation";

const keys = parseSunatKeyring("k1", JSON.stringify({ k1: "ab".repeat(32) }));
const scope = {
  organization_id: randomUUID(),
  company_id: randomUUID(),
  connection_id: randomUUID(),
  credential_version: 1,
};
const payload = {
  ruc: "20000000001",
  username: "simulator-user",
  password: "fictional",
};
it("cifra con nonce único y no conserva texto plano", () => {
  const encrypted = encryptSunatCredentials(payload, scope, keys);
  expect(JSON.stringify(encrypted)).not.toContain(payload.password);
  expect(decryptSunatCredentials(encrypted, scope, keys)).toEqual(payload);
  expect(encryptSunatCredentials(payload, scope, keys).iv).not.toBe(
    encrypted.iv,
  );
});
it("rechaza otra empresa, estudio, versión y datos manipulados", () => {
  const encrypted = encryptSunatCredentials(payload, scope, keys);
  for (const changed of [
    { ...scope, company_id: randomUUID() },
    { ...scope, organization_id: randomUUID() },
    { ...scope, credential_version: 2 },
  ])
    expect(() => decryptSunatCredentials(encrypted, changed, keys)).toThrow(
      "SUNAT_CREDENTIALS_UNREADABLE",
    );
  expect(() =>
    decryptSunatCredentials(
      { ...encrypted, tag: "00".repeat(16) },
      scope,
      keys,
    ),
  ).toThrow();
});
it("admite descifrado con clave anterior durante una rotación", () => {
  const encrypted = encryptSunatCredentials(payload, scope, keys);
  const rotated = parseSunatKeyring(
    "k2",
    JSON.stringify({ ...keys.keys, k2: "cd".repeat(32) }),
  );
  expect(decryptSunatCredentials(encrypted, scope, rotated)).toEqual(payload);
  expect(() => parseSunatKeyring("missing", "{}")).toThrow(
    "SUNAT_KEYS_NOT_CONFIGURED",
  );
});
it("el permiso documental no concede buzón y nunca permite clientes", () => {
  expect(canReadSunat(moduleContext, moduleCompanyA)).toBe(false);
  const internal = { ...moduleContext, mailbox_company_ids: [moduleCompanyA] };
  expect(canReadSunat(internal, moduleCompanyA)).toBe(true);
  expect(canReadSunat(internal, moduleCompanyB)).toBe(false);
  expect(
    canReadSunat({
      ...internal,
      member: { ...internal.member, member_type: "client" },
    }),
  ).toBe(false);
  expect(
    workspaceNavigation(internal).find((item) => item.id === "buzon-sunat"),
  ).toBeDefined();
});
it("cambiar empresa limpia mensaje y periodo; login conserva un retorno válido", () => {
  const route = workspaceRoute(
    "/buzon-sunat",
    new URLSearchParams({ companyId: moduleCompanyA }),
  );
  expect(companyChangeDestination("/buzon-sunat", route, moduleCompanyB)).toBe(
    "/buzon-sunat?companyId=" + moduleCompanyB,
  );
  const destination = `/buzon-sunat?companyId=${moduleCompanyA}&year=2026&month=9&messageId=${moduleCompanyB}`;
  expect(safeReturnTo(destination)).toBe(destination);
  const next = sunatFilterDestination(
    new URLSearchParams("page=5&messageId=" + moduleCompanyB),
    { month: "9" },
  );
  expect(next).not.toContain("messageId");
  expect(next).not.toContain("page");
  expect(
    parseSunatFilters(
      new URLSearchParams("month=99&page=-1"),
      new Date("2026-10-27T12:00:00Z"),
    ).month,
  ).toBe(10);
});
it("rechaza adjuntos con destino ajeno, tokens, identidad distinta y HTML", () => {
  expect(isOfficialSunatUrl("https://sunat.gob.pe.evil.example")).toBe(false);
  const path = "/ol-ti-itvisornoti/visor/bajarArchivo/observed/20000000001";
  expect(
    attachmentFromLink(
      path,
      "documento.pdf",
      "https://ww1.sunat.gob.pe",
      "20000000001",
    ).locator,
  ).toBe(path);
  expect(() =>
    attachmentFromLink(
      path + "?token=x",
      "file.pdf",
      "https://ww1.sunat.gob.pe",
      "20000000001",
    ),
  ).toThrow();
  expect(() =>
    attachmentFromLink(
      path,
      "file.pdf",
      "https://ww1.sunat.gob.pe",
      "20000000002",
    ),
  ).toThrow();
  expect(() =>
    validatedSourceFile(Buffer.from("<html>login</html>")),
  ).toThrow();
  expect(validatedSourceFile(Buffer.from("%PDF-1.7\nfixture")).mime).toBe(
    "application/pdf",
  );
  expect(() => sourceDate("31/02/2026")).toThrow();
});
it("el simulador rechaza Cloud y el Supabase de presentación antes de crear solicitudes", () => {
  expect(
    () => new SimulatorSunatSource("https://example.supabase.co"),
  ).toThrow();
  expect(() => new SimulatorSunatSource("http://127.0.0.1:54331")).toThrow();
  expect(
    () => new SimulatorSunatSource("http://127.0.0.1:54431"),
  ).not.toThrow();
});
it("la publicación ficticia usa la fecha civil de Lima antes de medianoche UTC", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-28T02:00:00Z"));
  try {
    const source = new SimulatorSunatSource("http://127.0.0.1:54431");
    const page = await source.readPage({
      connectionKey: "test",
      mailbox: "messages",
      page: 1,
      signal: new AbortController().signal,
    });
    expect(page.items[0].published_on).toBe("2026-10-27");
  } finally {
    vi.useRealTimers();
  }
});
