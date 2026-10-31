import { MailboxError } from "../../sunat-pilot/worker/services/mailbox-error";

export function requireOfficialLoginUrl(raw: string): void {
  try {
    const url = new URL(raw);
    const callback = new URL(url.searchParams.get("originalUrl") ?? "");
    if (
      url.protocol !== "https:" ||
      url.hostname !== "api-seguridad.sunat.gob.pe" ||
      !/^\/v1\/clientessol\/[a-f\d-]{36}\/oauth2\/loginMenuSol$/i.test(
        url.pathname,
      ) ||
      url.username ||
      url.password ||
      url.port ||
      url.hash ||
      url.searchParams.getAll("originalUrl").length !== 1 ||
      callback.origin !== "https://e-menu.sunat.gob.pe" ||
      callback.pathname !== "/cl-ti-itmenu/AutenticaMenuInternet.htm" ||
      callback.username ||
      callback.password ||
      callback.search ||
      callback.hash
    )
      throw new MailboxError("UNEXPECTED_RESPONSE");
  } catch {
    throw new MailboxError("UNEXPECTED_RESPONSE");
  }
}

export function requireOfficialLoginSubmission(
  action: string | null,
  current: string,
): void {
  requireOfficialLoginUrl(current);
  try {
    if (!action) throw new Error("MISSING_ACTION");
    const page = new URL(current);
    const destination = new URL(action, page);
    if (
      destination.origin !== page.origin ||
      destination.pathname !==
        page.pathname.replace(/loginMenuSol$/i, "j_security_check") ||
      destination.search ||
      destination.hash ||
      destination.username ||
      destination.password
    )
      throw new Error("UNEXPECTED_ACTION");
  } catch {
    throw new MailboxError("UNEXPECTED_RESPONSE");
  }
}
