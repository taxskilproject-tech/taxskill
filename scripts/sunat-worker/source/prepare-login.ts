import type { Page } from "playwright-core";

import type { SunatCredentialPayload } from "../../../src/domain/sunat/types/credentials.types";
import { MailboxError } from "../../sunat-pilot/worker/services/mailbox-error";
import { SUNAT_LOGIN_READY_TIMEOUT_MS } from "../constants/source";
import type { SolLoginGlobals } from "../types/source.types";
import {
  requireOfficialLoginSubmission,
  requireOfficialLoginUrl,
} from "../utils/login-url";

export async function prepareSolLogin(
  page: Page,
  credentials: SunatCredentialPayload,
): Promise<void> {
  requireOfficialLoginUrl(page.url());
  await page.waitForLoadState("load", {
    timeout: SUNAT_LOGIN_READY_TIMEOUT_MS,
  });
  await page.waitForFunction(
    () => {
      const portal: SolLoginGlobals = window;
      return (
        document.readyState === "complete" &&
        typeof portal.login === "function" &&
        typeof portal.tipoLogueo === "number" &&
        typeof portal.txtRuc?.val === "function" &&
        typeof portal.txtUsuario?.val === "function" &&
        typeof portal.txtContrasena?.val === "function"
      );
    },
    undefined,
    { timeout: SUNAT_LOGIN_READY_TIMEOUT_MS },
  );
  const form = page.locator('form[name="LoginForm"]');
  if ((await form.getAttribute("method"))?.toLowerCase() !== "post")
    throw new MailboxError("UNEXPECTED_RESPONSE");
  requireOfficialLoginSubmission(await form.getAttribute("action"), page.url());
  const usesRuc = await page.evaluate(() => {
    const portal: SolLoginGlobals = window;
    return portal.tipoLogueo === 2;
  });
  if (!usesRuc) await page.locator("#btnPorRuc").click();
  await page.waitForFunction(
    () => {
      const portal: SolLoginGlobals = window;
      return portal.tipoLogueo === 2;
    },
    undefined,
    { timeout: SUNAT_LOGIN_READY_TIMEOUT_MS },
  );
  const ruc = page.getByPlaceholder("RUC", { exact: true });
  const user = page.getByPlaceholder("Usuario", { exact: true });
  const password = page.getByPlaceholder("Contraseña", { exact: true });
  // SOL convierte el usuario a mayúsculas al salir del campo; la clave no cambia.
  const officialUsername = credentials.username.toUpperCase();
  await ruc.fill(credentials.ruc);
  await user.fill(officialUsername);
  await password.fill(credentials.password);
  if (
    (await ruc.inputValue()) !== credentials.ruc ||
    (await user.inputValue()) !== officialUsername ||
    (await password.inputValue()) !== credentials.password
  )
    throw new MailboxError("SOURCE_CHANGED");
}
