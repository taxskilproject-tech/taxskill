import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer } from "node:http";
import type { Page } from "playwright-core";
import { chromium } from "playwright-core";

import { requireMailboxReady } from "../sunat-worker/source/mailbox-ready";

const FIXTURE_RUC = "20000000001";
const RESPONSE_TIMEOUT_MS = 600;
const results: string[] = [];

function identityMarkup(value = FIXTURE_RUC): string {
  return `<meta name="meta-token" content="${value}">`;
}

function serveFixture(
  request: IncomingMessage,
  response: ServerResponse,
): void {
  response.setHeader("Content-Type", "text/html");
  if (request.url === "/pending.js") {
    response.write("/* pending local fixture */");
    return;
  }
  if (request.url === "/child") {
    response.end('<script src="/pending.js"></script>');
    return;
  }
  if (request.url === "/delayed") {
    response.write("<html><head>");
    setTimeout(
      () => response.end(identityMarkup() + "</head><body></body>"),
      100,
    );
    return;
  }
  if (request.url === "/wrong") {
    response.end(identityMarkup("20000000002"));
    return;
  }
  if (request.url === "/duplicate") {
    response.end(identityMarkup() + identityMarkup());
    return;
  }
  if (request.url === "/missing") {
    response.end("<html><body>Fixture sin identidad</body></html>");
    return;
  }
  response.end(
    identityMarkup() +
      '<script defer src="/pending.js"></script><body><iframe src="/child"></iframe></body>',
  );
}

async function checkBlockedFrame(page: Page, origin: string): Promise<void> {
  await page.goto(origin, { waitUntil: "commit" });
  const frame = page.mainFrame();
  await assert.rejects(
    frame.waitForLoadState("domcontentloaded", {
      timeout: RESPONSE_TIMEOUT_MS,
    }),
    { name: "TimeoutError" },
  );
  results.push("legacy_global_wait_times_out_with_pending_resource");
  const started = performance.now();
  await requireMailboxReady(frame, FIXTURE_RUC);
  assert.ok(performance.now() - started < RESPONSE_TIMEOUT_MS);
  results.push("identity_ready_without_waiting_for_pending_resource");
}

async function checkIdentityFailures(
  page: Page,
  origin: string,
): Promise<void> {
  await page.goto(origin + "/wrong", { waitUntil: "domcontentloaded" });
  await assert.rejects(requireMailboxReady(page.mainFrame(), FIXTURE_RUC), {
    code: "UNEXPECTED_RESPONSE",
  });
  results.push("other_company_rejected");
  await page.goto(origin + "/duplicate", { waitUntil: "domcontentloaded" });
  await assert.rejects(requireMailboxReady(page.mainFrame(), FIXTURE_RUC), {
    code: "UNEXPECTED_RESPONSE",
  });
  results.push("ambiguous_identity_rejected");
}

async function checkDeferredIdentity(
  page: Page,
  origin: string,
): Promise<void> {
  await page.goto(origin + "/delayed", { waitUntil: "commit" });
  await requireMailboxReady(page.mainFrame(), FIXTURE_RUC);
  results.push("delayed_identity_awaited");
  await page.goto(origin + "/missing", { waitUntil: "domcontentloaded" });
  await assert.rejects(requireMailboxReady(page.mainFrame(), FIXTURE_RUC), {
    name: "TimeoutError",
  });
  results.push("missing_identity_fails_with_bounded_timeout");
}

async function main(): Promise<void> {
  if (process.env.TAXSKILL_H10_DOCKER_LAB !== "1")
    throw new Error("DOCKER_LOCAL_FIXTURE_REQUIRED");
  const server = createServer(serveFixture);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const browser = await chromium.launch({ chromiumSandbox: true });
  try {
    const page = await browser.newPage();
    const origin = `http://127.0.0.1:${address.port}`;
    await checkBlockedFrame(page, origin);
    await checkIdentityFailures(page, origin);
    await checkDeferredIdentity(page, origin);
    writeFileSync(
      "/private/results/mailbox-ready.json",
      JSON.stringify({ passed: results.length, checks: results }, null, 2),
    );
    console.log(JSON.stringify({ passed: results.length, checks: results }));
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "FIXTURE_FAILED");
  process.exitCode = 1;
});
