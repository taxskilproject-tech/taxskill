import { MailboxError } from "../../sunat-pilot/worker/services/mailbox-error";
import type {
  BrowserSession,
  SourceRequestParams,
} from "../types/source.types";
import { isOfficialSunatUrl } from "../utils/source-validation";

const MAX_RESPONSE_BYTES = 1048576;

export async function requestSunatPage(
  session: BrowserSession,
  ruc: string,
  params: SourceRequestParams,
): Promise<unknown> {
  const url = new URL(
    "/ol-ti-itvisornoti/visor/listNotiMenPag",
    session.frame.url(),
  );
  if (!isOfficialSunatUrl(url.href))
    throw new MailboxError("UNEXPECTED_RESPONSE");
  const response = await session.context.request.get(url.href, {
    headers: { "X-Ruc": ruc },
    params,
    maxRedirects: 0,
    timeout: 15000,
  });
  try {
    if ([301, 302, 303, 307, 308, 401].includes(response.status()))
      throw new MailboxError("SESSION_EXPIRED");
    if (response.status() === 403 || response.status() === 429)
      throw new MailboxError("VERIFICATION_REQUIRED");
    if (!response.ok()) throw new MailboxError("SOURCE_UNAVAILABLE");
    const bytes = await response.body();
    if (bytes.length > MAX_RESPONSE_BYTES)
      throw new MailboxError("UNEXPECTED_RESPONSE");
    const payload: unknown = JSON.parse(bytes.toString("utf8"));
    return payload;
  } catch (error) {
    if (error instanceof MailboxError) throw error;
    throw new MailboxError("UNEXPECTED_RESPONSE");
  } finally {
    await response.dispose();
  }
}
