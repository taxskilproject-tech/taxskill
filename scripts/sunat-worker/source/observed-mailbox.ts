import type { Frame } from "playwright-core";

import { MailboxError } from "../../sunat-pilot/worker/services/mailbox-error";
import type { MailboxKind } from "../../sunat-pilot/worker/types/mailbox.types";
import type { ObservedPage } from "../types/source.types";

export async function readObservedMailbox(frame: Frame): Promise<ObservedPage> {
  return frame.locator("body").evaluate((body) => ({
    text:
      body instanceof HTMLElement ? body.innerText : (body.textContent ?? ""),
    rows: Array.from(body.querySelectorAll("ul.list-group > li[id]")).map(
      (row) => ({
        id: row.id,
        text: row.textContent ?? "",
        subject: row.querySelector("a.linkMensaje")?.textContent ?? "",
        unread: row.classList.contains("msj_nuevo"),
      }),
    ),
  }));
}

export async function selectMailbox(
  frame: Frame,
  mailbox: MailboxKind,
): Promise<void> {
  const name =
    mailbox === "notifications"
      ? /Buz[oó]n.*Notificaciones/i
      : /Buz[oó]n.*Mensajes/i;
  await frame.getByRole("link", { name }).click();
  await frame.waitForFunction(() =>
    /\d+\s*[-–]\s*\d+\s+de\s+\d+/.test(document.body.innerText),
  );
}

export async function nextMailboxPage(frame: Frame): Promise<void> {
  const before = (await readObservedMailbox(frame)).text.match(
    /\d+\s*[-–]\s*\d+\s+de\s+\d+/,
  )?.[0];
  await frame.locator("button.nextCorreo").click();
  await frame
    .waitForFunction((previous) => {
      const counter = document.body.innerText.match(
        /\d+\s*[-–]\s*\d+\s+de\s+\d+/,
      )?.[0];
      return counter !== previous;
    }, before)
    .catch(() => {
      throw new MailboxError("SOURCE_UNAVAILABLE");
    });
}
