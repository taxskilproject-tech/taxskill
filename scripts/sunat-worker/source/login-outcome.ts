import type { Page } from "playwright-core";

import { MailboxError } from "../../sunat-pilot/worker/services/mailbox-error";
import type { LoginStatusReader } from "../types/login-diagnostics.types";
import { safeLoginDiagnostics } from "../utils/login-diagnostics";

export function exitControl(page: Page) {
  return page
    .getByRole("button", { name: /Salir/i })
    .or(page.getByRole("link", { name: /Salir/i }))
    .first();
}

export function mailboxControl(page: Page) {
  return page
    .getByRole("button", { name: /Buz[oó]n/i })
    .or(page.getByRole("link", { name: /Buz[oó]n/i }))
    .or(page.getByText(/^Buz[oó]n(?:\s+Electr[oó]nico)?$/i))
    .first();
}

export async function requireLoginOutcome(
  page: Page,
  statuses: LoginStatusReader = () => ({
    login_http_status: null,
    menu_http_status: null,
  }),
): Promise<void> {
  try {
    await exitControl(page).waitFor({ timeout: 25000 });
  } catch {
    const verification = page.locator(
      "[id*=captcha i]:visible, iframe[src*=captcha i]:visible",
    );
    const loginVisible = await page
      .getByPlaceholder("RUC", { exact: true })
      .isVisible();
    const text = await page.locator("body").innerText();
    const diagnostics = safeLoginDiagnostics({
      url: page.url(),
      text,
      login_form_visible: loginVisible,
      captcha_visible: (await verification.count()) > 0,
      exit_count: await exitControl(page).count(),
      mailbox_count: await mailboxControl(page).count(),
      http: statuses(),
    });
    console.error(
      JSON.stringify({
        event: "source_login_incomplete",
        ...diagnostics,
      }),
    );
    if (diagnostics.captcha_visible || diagnostics.verification_notice)
      throw new MailboxError("VERIFICATION_REQUIRED");
    if (loginVisible && diagnostics.credential_error)
      throw new MailboxError("CREDENTIAL_REJECTED");
    throw new MailboxError("SOURCE_UNAVAILABLE");
  }
}
