import type { Frame } from "playwright-core";

import { MailboxError } from "../../sunat-pilot/worker/services/mailbox-error";
import { SUNAT_LOGIN_READY_TIMEOUT_MS } from "../constants/source";
import { requireMailboxIdentity } from "../utils/mailbox-identity";

export async function requireMailboxReady(
  frame: Frame,
  ruc: string,
): Promise<void> {
  const identity = frame.locator('meta[name="meta-token"]');
  // Un recurso pendiente puede bloquear la carga global del buzón ya disponible.
  await identity.first().waitFor({
    state: "attached",
    timeout: SUNAT_LOGIN_READY_TIMEOUT_MS,
  });
  if ((await identity.count()) !== 1)
    throw new MailboxError("UNEXPECTED_RESPONSE");
  requireMailboxIdentity(await identity.getAttribute("content"), ruc);
}
