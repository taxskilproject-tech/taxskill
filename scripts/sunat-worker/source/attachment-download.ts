import type { Download } from "playwright-core";

import { SUNAT_FILE_LIMIT } from "../../../src/domain/sunat/constants/sunat";
import { MailboxError } from "../../sunat-pilot/worker/services/mailbox-error";
import type { BrowserSession } from "../types/source.types";
import {
  attachmentFromLink,
  validatedSourceFile,
} from "../utils/source-validation";

async function readDownload(download: Download): Promise<Buffer> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of stream) {
    size += chunk.length;
    if (size > SUNAT_FILE_LIMIT) {
      await download.cancel();
      throw new MailboxError("FILE_TOO_LARGE");
    }
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function downloadSourceAttachment(
  session: BrowserSession,
  ruc: string,
  locator: string,
) {
  attachmentFromLink(locator, "archivo.pdf", session.frame.url(), ruc);
  const expected = new URL(locator, session.frame.url());
  const links = session.frame.locator('a[href*="/visor/bajarArchivo/"]');
  const hrefs = await links.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("href")),
  );
  const index = hrefs.findIndex(
    (href) => href === locator || href === expected.href,
  );
  if (index < 0) throw new MailboxError("SOURCE_CHANGED");
  const [download] = await Promise.all([
    session.page.waitForEvent("download", { timeout: 20000 }),
    links.nth(index).click(),
  ]);
  try {
    const actual = new URL(download.url());
    if (
      actual.origin !== expected.origin ||
      actual.pathname !== expected.pathname
    )
      throw new MailboxError("UNEXPECTED_RESPONSE");
    return validatedSourceFile(await readDownload(download));
  } finally {
    await download.delete();
  }
}
