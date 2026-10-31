import type { Frame, Locator } from "playwright-core";

import { MailboxError } from "../../sunat-pilot/worker/services/mailbox-error";
import { sunatDetailReadEffectSchema } from "../contracts/source.schema";
import { isOfficialSunatUrl } from "../utils/source-validation";

export async function openMessageDetail(frame: Frame, control: Locator) {
  const pending = frame
    .page()
    .waitForResponse(
      (response) =>
        response.frame() === frame &&
        isOfficialSunatUrl(response.url()) &&
        /^\/ol-ti-itvisornoti\/visor\/obtenerDetalleNotiMen(?:\/|$)/.test(
          new URL(response.url()).pathname,
        ),
      { timeout: 15000 },
    );
  const [response] = await Promise.all([pending, control.click()]);
  if (!response.ok()) throw new MailboxError("SOURCE_UNAVAILABLE");
  await response.finished();
  const payload: unknown = await response.json();
  const parsed = sunatDetailReadEffectSchema.safeParse(payload);
  if (!parsed.success) throw new MailboxError("UNEXPECTED_RESPONSE");
  return parsed.data.updateLeido ?? null;
}
