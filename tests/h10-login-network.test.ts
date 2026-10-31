import { expect, it } from "vitest";

import { LOGIN_TRACE_LIMIT } from "../scripts/sunat-worker/constants/login-diagnostics";
import { createLoginNetworkRecorder } from "../scripts/sunat-worker/services/login-network-recorder";
import { safeLoginDiagnostics } from "../scripts/sunat-worker/utils/login-diagnostics";
import {
  safeLoginRedirect,
  safeLoginRequestFailure,
} from "../scripts/sunat-worker/utils/login-network";

const origin =
  "https://api-seguridad.sunat.gob.pe/private?token=private-fixture";
const destination = "https://e-menu.sunat.gob.pe/private?state=private-state";

it("distingue destino oficial, retorno HTTP y origen ajeno sin exportar URL", () => {
  expect(safeLoginRedirect(origin, 302, destination)).toEqual({
    from: "sol_login",
    to: "sol_menu",
    status: 302,
    https: true,
  });
  expect(
    safeLoginRedirect(origin, 302, destination.replace("https:", "http:")),
  ).toMatchObject({
    to: "unexpected_origin",
    https: false,
  });
  expect(
    safeLoginRedirect(origin, 303, "https://elsewhere.invalid/secret"),
  ).toMatchObject({
    to: "unexpected_origin",
    https: true,
  });
  const serialized = JSON.stringify(
    safeLoginRedirect(origin, 302, destination),
  );
  for (const secret of [
    "private-fixture",
    "private-state",
    "https:",
    "private?",
  ])
    expect(serialized).not.toContain(secret);
});

it("descarta respuestas sin redirección o con estado/destino inválidos", () => {
  expect(safeLoginRedirect(origin, 200, destination)).toBeNull();
  expect(safeLoginRedirect(origin, 302, null)).toBeNull();
  expect(safeLoginRedirect(origin, Number.NaN, destination)).toBeNull();
  expect(safeLoginRedirect(origin, 302.5, destination)).toBeNull();
  expect(safeLoginRedirect(origin, 302, "https://[")).toBeNull();
});

it("acota los códigos de red y tipos de recurso a valores conocidos", () => {
  expect(
    safeLoginRequestFailure(origin, "script", "net::ERR_NAME_NOT_RESOLVED"),
  ).toEqual({
    origin: "sol_login",
    resource: "script",
    code: "ERR_NAME_NOT_RESOLVED",
  });
  expect(
    safeLoginRequestFailure(
      origin,
      "private-resource",
      "token=private-failure",
    ),
  ).toEqual({
    origin: "sol_login",
    resource: "other",
    code: "OTHER",
  });
});

it("conserva una traza acotada y reinicia el diagnóstico al enviar el login", () => {
  const recorder = createLoginNetworkRecorder();
  for (let index = 0; index < LOGIN_TRACE_LIMIT * 4; index += 1) {
    recorder.response(origin, 302, destination);
    recorder.failure(origin, "script", "net::ERR_CONNECTION_RESET");
    recorder.blocked(origin, index === 0);
  }
  recorder.webError("ReferenceError");
  recorder.webError("private-error-name");
  recorder.consoleError();
  const snapshot = recorder.read();
  expect(snapshot.redirects).toHaveLength(LOGIN_TRACE_LIMIT);
  expect(snapshot.document_responses).toHaveLength(LOGIN_TRACE_LIMIT);
  expect(snapshot.failed_requests).toHaveLength(LOGIN_TRACE_LIMIT);
  expect(snapshot).toMatchObject({
    blocked_requests: LOGIN_TRACE_LIMIT * 4,
    request_limit_exceeded: true,
    last_web_error: "Other",
    web_error_count: 2,
    console_error_count: 1,
  });
  recorder.begin();
  expect(recorder.read()).toMatchObject({
    redirects: [],
    failed_requests: [],
    blocked_requests: 0,
    request_limit_exceeded: false,
    web_error_count: 0,
    console_error_count: 0,
  });
});

it("devuelve una copia para que el consumidor no modifique el diagnóstico", () => {
  const recorder = createLoginNetworkRecorder();
  recorder.response(origin, 302, destination);
  recorder.read().redirects.splice(0);
  expect(recorder.read().redirects).toHaveLength(1);
});

it("elimina campos adicionales antes de registrar los datos de red", () => {
  const recorder = createLoginNetworkRecorder();
  recorder.response(origin, 302, destination);
  const network = {
    ...recorder.read(),
    raw_html: "private-html",
    token: "private-token",
  };
  const http = {
    login_http_status: 302,
    menu_http_status: null,
    network,
    url: origin,
  };
  const result = safeLoginDiagnostics({
    url: origin,
    text: "",
    login_form_visible: false,
    captcha_visible: false,
    exit_count: 0,
    mailbox_count: 0,
    http,
  });
  expect(result.network_observation?.redirects[0]?.to).toBe("sol_menu");
  for (const value of ["private-html", "private-token", "raw_html", "https:"])
    expect(JSON.stringify(result)).not.toContain(value);
});
