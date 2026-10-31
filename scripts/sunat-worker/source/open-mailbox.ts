import type { BrowserContext, Frame, Page } from "playwright-core";

import { MailboxError } from "../../sunat-pilot/worker/services/mailbox-error";
import type { MailboxLocation } from "../types/source.types";
import { isOfficialSunatUrl } from "../utils/source-validation";
import { prepareMailboxControl } from "./prepare-mailbox";

function mailboxFrame(frame: Frame): boolean {
  return (
    isOfficialSunatUrl(frame.url()) &&
    new URL(frame.url()).pathname.startsWith("/ol-ti-itvisornoti/visor/")
  );
}

function currentMailbox(context: BrowserContext): MailboxLocation | undefined {
  for (const page of context.pages()) {
    const frame = page.frames().find(mailboxFrame);
    if (frame) return { page, frame };
  }
  return undefined;
}

export async function openMailbox(
  context: BrowserContext,
  menu: Page,
): Promise<MailboxLocation> {
  const existing = currentMailbox(context);
  if (existing) return existing;
  const control = await prepareMailboxControl(menu);
  const toggle = menu.getByRole("button", { name: "Toggle", exact: true });
  if (!(await control.isVisible()) && (await toggle.isVisible()))
    await toggle.click();
  console.log(
    JSON.stringify({
      event: "source_mailbox_opening",
      control_visible: await control.isVisible(),
      controls: await control.count(),
    }),
  );
  if (await control.count()) await control.click();
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    const located = currentMailbox(context);
    if (located) return located;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  console.error(
    JSON.stringify({
      event: "source_mailbox_layout",
      mailbox_controls: await control.count(),
      frame_count: menu.frames().length,
      popup_count: context.pages().length,
    }),
  );
  throw new MailboxError("SOURCE_UNAVAILABLE");
}
