import { chromium } from "playwright-core";

import type { SunatCredentialPayload } from "../../../src/domain/sunat/types/credentials.types";
import { MailboxError } from "../../sunat-pilot/worker/services/mailbox-error";
import {
  SUNAT_CONTEXT_MAX_REQUESTS,
  SUNAT_ENTRY_TIMEOUT_MS,
  SUNAT_OFFICIAL_ENTRY,
} from "../constants/source";
import type { BrowserSession, SourceOptions } from "../types/source.types";
import { requireMailboxIdentity } from "../utils/mailbox-identity";
import { isOfficialSunatUrl } from "../utils/source-validation";
import { requireLoginOutcome } from "./login-outcome";
import { observeLoginResponses } from "./login-responses";
import { openMailbox } from "./open-mailbox";
import { prepareSolLogin } from "./prepare-login";

export async function openSunatSession(
  credentials: SunatCredentialPayload,
  options: SourceOptions,
): Promise<BrowserSession> {
  options.signal?.throwIfAborted();
  let stage = "launch";
  const browser = await chromium.launch({
    // El Menú SOL no completó la navegación headless en el piloto medido.
    headless: false,
    chromiumSandbox: true,
    executablePath: options.executablePath,
    timeout: SUNAT_ENTRY_TIMEOUT_MS,
  });
  let closing: Promise<void> | null = null;
  const close = () => (closing ??= browser.close());
  const abort = () => {
    void close().catch(() =>
      console.error(
        JSON.stringify({
          event: "source_cleanup_failed",
          code: "WORKER_CLEANUP_FAILED",
        }),
      ),
    );
  };
  try {
    await options.onBrowser?.({ close });
    options.signal?.throwIfAborted();
    options.signal?.addEventListener("abort", abort, { once: true });
    const context = await browser.newContext({
      acceptDownloads: true,
      locale: "es-PE",
      serviceWorkers: "block",
    });
    const statuses = observeLoginResponses(context);
    context.on("request", () => options.onRequest?.());
    let requests = 0;
    await context.route("**/*", async (route) => {
      requests += 1;
      const url = route.request().url();
      if (requests <= SUNAT_CONTEXT_MAX_REQUESTS && isOfficialSunatUrl(url))
        return route.continue();
      statuses.blocked(url, requests > SUNAT_CONTEXT_MAX_REQUESTS);
      await route.abort();
    });
    const page = await context.newPage();
    page.on("requestfailed", (request) => {
      if (!request.isNavigationRequest()) return;
      const code = request.failure()?.errorText;
      if (code === "net::ERR_ABORTED") return;
      console.error(
        JSON.stringify({
          event: "source_navigation_failed",
          stage,
          host: new URL(request.url()).hostname,
          code: code?.match(/^net::ERR_[A-Z_]+$/)?.[0] ?? "NETWORK_ERROR",
        }),
      );
    });
    page.setDefaultTimeout(15000);
    stage = "official_entry";
    const entry = await page.goto(SUNAT_OFFICIAL_ENTRY, {
      waitUntil: "domcontentloaded",
      timeout: SUNAT_ENTRY_TIMEOUT_MS,
    });
    if (entry?.status() === 403 || entry?.status() === 429)
      throw new MailboxError("VERIFICATION_REQUIRED");
    stage = "login_form";
    await page
      .getByPlaceholder("RUC", { exact: true })
      .waitFor({ state: "attached" });
    await prepareSolLogin(page, credentials);
    stage = "login_submit";
    statuses.begin();
    await page.getByRole("button", { name: /Iniciar sesi[oó]n/i }).click();
    await requireLoginOutcome(page, statuses.read);
    stage = "mailbox_frame";
    const located = await openMailbox(context, page);
    const { frame } = located;
    stage = "mailbox_loaded";
    await frame.waitForLoadState("domcontentloaded");
    stage = "mailbox_identity";
    const identity = frame.locator('meta[name="meta-token"]');
    if ((await identity.count()) !== 1)
      throw new MailboxError("UNEXPECTED_RESPONSE");
    requireMailboxIdentity(
      await identity.getAttribute("content"),
      credentials.ruc,
    );
    return { browser: { close }, context, page: located.page, frame };
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "source_connection_failed",
        stage,
        reason:
          error instanceof MailboxError
            ? error.code
            : error instanceof Error
              ? error.name
              : "unknown",
      }),
    );
    await close();
    if (error instanceof MailboxError) throw error;
    throw new MailboxError("SOURCE_UNAVAILABLE");
  } finally {
    options.signal?.removeEventListener("abort", abort);
  }
}
