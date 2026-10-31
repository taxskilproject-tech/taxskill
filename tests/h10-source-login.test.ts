import { expect, it } from "vitest";

import {
  requireOfficialLoginSubmission,
  requireOfficialLoginUrl,
} from "../scripts/sunat-worker/utils/login-url";
import { requireMailboxIdentity } from "../scripts/sunat-worker/utils/mailbox-identity";
import { validatedSourceFile } from "../scripts/sunat-worker/utils/source-validation";
import { SUNAT_FILE_LIMIT } from "../src/domain/sunat/constants/sunat";

it("informa el límite de 20 MB de manera explícita", () => {
  expect(() => validatedSourceFile(Buffer.alloc(SUNAT_FILE_LIMIT + 1))).toThrow(
    "FILE_TOO_LARGE",
  );
});

it("rechaza la identidad de otra empresa o una coincidencia parcial", () => {
  expect(() =>
    requireMailboxIdentity("20000000001", "20000000001"),
  ).not.toThrow();
  expect(() => requireMailboxIdentity("20000000002", "20000000001")).toThrow(
    "UNEXPECTED_RESPONSE",
  );
  expect(() =>
    requireMailboxIdentity("20000000001-other", "20000000001"),
  ).toThrow("UNEXPECTED_RESPONSE");
  expect(() => requireMailboxIdentity(null, "20000000001")).toThrow(
    "UNEXPECTED_RESPONSE",
  );
});

function loginUrl() {
  const url = new URL(
    "https://api-seguridad.sunat.gob.pe/v1/clientessol/11111111-2222-4333-8444-555555555555/oauth2/loginMenuSol",
  );
  url.searchParams.set(
    "originalUrl",
    "https://e-menu.sunat.gob.pe/cl-ti-itmenu/AutenticaMenuInternet.htm",
  );
  url.searchParams.set("state", "fictional-preauth-state");
  return url;
}

it("comprueba el origen y retorno oficiales antes de rellenar credenciales", () => {
  expect(() => requireOfficialLoginUrl(loginUrl().href)).not.toThrow();
});

it("el formulario solo puede enviar credenciales al endpoint del mismo cliente SOL", () => {
  expect(() =>
    requireOfficialLoginSubmission("j_security_check", loginUrl().href),
  ).not.toThrow();
});

it.each([
  null,
  "http://api-seguridad.sunat.gob.pe/j_security_check",
  "https://elsewhere.invalid/j_security_check",
  "j_security_check?token=unexpected",
  "javascript:alert(1)",
  "/v1/clientessol/22222222-3333-4444-8555-666666666666/oauth2/j_security_check",
])("rechaza un destino inesperado del formulario: %s", (action) => {
  expect(() => requireOfficialLoginSubmission(action, loginUrl().href)).toThrow(
    "UNEXPECTED_RESPONSE",
  );
});

it("rechaza páginas ajenas, HTTP, rutas imprevistas y credenciales en URL", () => {
  const url = loginUrl();
  url.hostname = "api-seguridad.sunat.gob.pe.example.invalid";
  expect(() => requireOfficialLoginUrl(url.href)).toThrow(
    "UNEXPECTED_RESPONSE",
  );
  url.hostname = "api-seguridad.sunat.gob.pe";
  url.protocol = "http:";
  expect(() => requireOfficialLoginUrl(url.href)).toThrow(
    "UNEXPECTED_RESPONSE",
  );
  url.protocol = "https:";
  url.username = "forbidden";
  expect(() => requireOfficialLoginUrl(url.href)).toThrow(
    "UNEXPECTED_RESPONSE",
  );
  url.username = "";
  url.pathname = "/other-login";
  expect(() => requireOfficialLoginUrl(url.href)).toThrow(
    "UNEXPECTED_RESPONSE",
  );
});

it("rechaza retornos ajenos o ambiguos aunque el formulario esté en SUNAT", () => {
  const url = loginUrl();
  url.searchParams.set("originalUrl", "https://example.invalid/callback");
  expect(() => requireOfficialLoginUrl(url.href)).toThrow(
    "UNEXPECTED_RESPONSE",
  );
  url.searchParams.delete("originalUrl");
  expect(() => requireOfficialLoginUrl(url.href)).toThrow(
    "UNEXPECTED_RESPONSE",
  );
  expect(() => requireOfficialLoginUrl("invalid-url")).toThrow(
    "UNEXPECTED_RESPONSE",
  );
});
