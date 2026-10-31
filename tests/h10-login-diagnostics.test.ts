import { expect, it } from "vitest";

import type { LoginObservation } from "../scripts/sunat-worker/types/login-diagnostics.types";
import {
  loginPageKind,
  loginResponseKind,
  safeLoginDiagnostics,
} from "../scripts/sunat-worker/utils/login-diagnostics";

const observation: LoginObservation = {
  url: "https://api-seguridad.sunat.gob.pe/login?token=private-fixture-token",
  text: "Empresa ficticia 20000000001. Clave: fictional-private-value.",
  login_form_visible: true,
  captcha_visible: false,
  exit_count: 0,
  mailbox_count: 0,
  http: { login_http_status: 200, menu_http_status: null },
};

it("conserva señales útiles sin exportar URL, tokens, RUC ni texto del portal", () => {
  const result = safeLoginDiagnostics(observation);
  const serialized = JSON.stringify(result);
  expect(result.page_kind).toBe("sol_login");
  expect(result.login_http_status).toBe(200);
  for (const value of ["20000000001", "private-fixture-token", "fictional-private-value", "Empresa ficticia", "https:"])
    expect(serialized).not.toContain(value);
});

it("distingue mantenimiento, verificación, denegación y credenciales rechazadas", () => {
  expect(safeLoginDiagnostics({ ...observation, text: "Servicio en mantenimiento. Inténtelo más tarde." })).toMatchObject({ maintenance_notice: true, credential_error: false });
  expect(safeLoginDiagnostics({ ...observation, text: "Verifique su identidad con CAPTCHA." }).verification_notice).toBe(true);
  expect(safeLoginDiagnostics({ ...observation, text: "Access denied. Request rejected." }).access_denied_notice).toBe(true);
  expect(safeLoginDiagnostics({ ...observation, text: "Usuario o clave incorrectos." }).credential_error).toBe(true);
});

it("no atribuye el fallo a bloqueo cuando no hay una señal de denegación", () => {
  expect(safeLoginDiagnostics(observation)).toMatchObject({
    access_denied_notice: false,
    credential_error: false,
    maintenance_notice: false,
    verification_notice: false,
  });
});

it("clasifica únicamente orígenes oficiales y omite rutas y consultas", () => {
  expect(loginPageKind("https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm")).toBe("sol_menu");
  expect(loginPageKind("https://e-menu.sunat.gob.pe.example.invalid/private")).toBe("unexpected_origin");
  expect(loginPageKind("invalid")).toBe("unexpected_origin");
  expect(loginPageKind("http://api-seguridad.sunat.gob.pe/login")).toBe("unexpected_origin");
});

it("registra estados HTTP solo del login y retorno esperados", () => {
  const url = "https://api-seguridad.sunat.gob.pe/v1/clientessol/11111111-2222-4333-8444-555555555555/oauth2/login?state=private";
  expect(loginResponseKind(url, "POST")).toBe("login");
  expect(loginResponseKind(url, "GET")).toBeNull();
  expect(loginResponseKind("https://e-menu.sunat.gob.pe/cl-ti-itmenu/AutenticaMenuInternet.htm")).toBe("menu");
  expect(loginResponseKind("https://example.invalid/oauth2/loginMenuSol")).toBeNull();
  expect(loginResponseKind("https://e-menu.sunat.gob.pe/other")).toBeNull();
});
