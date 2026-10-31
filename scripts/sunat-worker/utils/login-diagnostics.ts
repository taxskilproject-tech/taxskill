import { loginNetworkSnapshotSchema } from "../contracts/login-network.schema";
import type {
  LoginDiagnostics,
  LoginObservation,
  LoginPageKind,
} from "../types/login-diagnostics.types";
import { isOfficialSunatUrl } from "./source-validation";

export function loginPageKind(raw: string): LoginPageKind {
  if (!isOfficialSunatUrl(raw)) return "unexpected_origin";
  const url = new URL(raw);
  if (url.hostname === "api-seguridad.sunat.gob.pe") return "sol_login";
  if (url.hostname === "e-menu.sunat.gob.pe") return "sol_menu";
  return "sunat_other";
}

export function safeLoginDiagnostics(
  observation: LoginObservation,
): LoginDiagnostics {
  const text = observation.text;
  const network = loginNetworkSnapshotSchema.safeParse(
    observation.http.network,
  );
  return {
    page_kind: loginPageKind(observation.url),
    login_form_visible: observation.login_form_visible,
    captcha_visible: observation.captcha_visible,
    exit_count: observation.exit_count,
    mailbox_count: observation.mailbox_count,
    login_http_status: observation.http.login_http_status,
    menu_http_status: observation.http.menu_http_status,
    network_observation: network.success ? network.data : null,
    credential_error: /incorrect|inv[aá]lid|no\s+coincid|bloquead/i.test(text),
    verification_notice:
      /captcha|verifi(?:ca|que).*identidad|no\s+(?:soy|es)\s+un\s+robot/i.test(
        text,
      ),
    maintenance_notice:
      /mantenimiento|int[eé]ntelo.*m[aá]s\s+tarde|servicio.*no\s+(?:est[aá]\s+)?disponible/i.test(
        text,
      ),
    access_denied_notice:
      /access\s+denied|acceso\s+(?:denegado|restringido)|request\s+rejected/i.test(
        text,
      ),
  };
}

export function loginResponseKind(
  raw: string,
  method = "GET",
): "login" | "menu" | null {
  if (!isOfficialSunatUrl(raw)) return null;
  const url = new URL(raw);
  if (
    url.hostname === "api-seguridad.sunat.gob.pe" &&
    method === "POST" &&
    /^\/v1\/clientessol\/[a-f\d-]{36}\/oauth2\//i.test(url.pathname)
  )
    return "login";
  if (
    url.hostname === "e-menu.sunat.gob.pe" &&
    url.pathname === "/cl-ti-itmenu/AutenticaMenuInternet.htm"
  )
    return "menu";
  return null;
}
