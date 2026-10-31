import { mkdirSync, writeFileSync } from "node:fs";

import { loadAuthorizedPilot } from "./services/pilot-input";
import { openSunatSession } from "./source/browser-session";
import type { BrowserSession } from "./types/source.types";
import { isOfficialSunatUrl } from "./utils/source-validation";

async function saveSourceScript(
  session: BrowserSession,
  src: string,
  filename: string,
): Promise<boolean> {
  const url = new URL(src, session.frame.url());
  if (!isOfficialSunatUrl(url.href) || !url.pathname.endsWith(".js"))
    return false;
  const response = await session.context.request.get(url.href, {
    maxRedirects: 0,
    timeout: 15000,
  });
  try {
    if (!response.ok()) throw new Error("SOURCE_SCRIPT_UNAVAILABLE");
    const script = await response.body();
    if (script.length > 2000000) throw new Error("SOURCE_SCRIPT_TOO_LARGE");
    writeFileSync(filename, script);
    return true;
  } finally {
    await response.dispose();
  }
}

async function main() {
  const { input, credentials } = loadAuthorizedPilot();
  if (!input.allow_source_inspection)
    throw new Error("PILOT_INSPECTION_NOT_AUTHORIZED");
  const session = await openSunatSession(credentials, {});
  const destination = "/private/results/source-inspection";
  mkdirSync(destination, { recursive: true });
  try {
    const scripts = await session.frame
      .locator("script[src]")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("src") ?? ""),
      );
    let saved = 0;
    for (const src of scripts) {
      const stored = await saveSourceScript(
        session,
        src,
        `${destination}/script-${saved}.js`,
      );
      saved += Number(stored);
    }
    const inlineScripts = await session.frame
      .locator("script:not([src])")
      .allTextContents();
    inlineScripts.forEach((script, index) => {
      if (script.length > 2000000) throw new Error("SOURCE_SCRIPT_TOO_LARGE");
      writeFileSync(`${destination}/inline-${index}.js`, script);
    });
    const controls = await session.frame
      .locator("select, .dropdown-menu, input:not([type=hidden])")
      .evaluateAll((elements) =>
        elements.map((element) => ({
          tag: element.tagName,
          id: element.id,
          class: element.className,
          text: element.textContent?.trim().slice(0, 2000),
        })),
      );
    writeFileSync(`${destination}/controls.json`, JSON.stringify(controls));
    console.log(
      JSON.stringify({
        event: "source_inspection_saved",
        scripts: saved,
        inline_scripts: inlineScripts.length,
      }),
    );
  } finally {
    await session.browser.close();
  }
}

main().catch(() => {
  console.error(JSON.stringify({ event: "source_inspection_failed" }));
  process.exitCode = 1;
});
