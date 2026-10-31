import type { MailboxLabRequest, MailboxLabResponse } from "../types/lab.types";
import type { MailboxKind, MailboxPage } from "../types/mailbox.types";
import { mailboxLabDataset } from "./dataset";

function responseFailure(request: MailboxLabRequest): number | null {
  if (request.scenario === "invalid_credentials") return 403;
  if (request.scenario === "captcha") return 428;
  if (request.scenario === "unavailable") return 503;
  if (request.scenario === "expired_always") return 401;
  if (request.scenario === "expired_once" && !request.renewed) return 401;
  return null;
}

function modifyPage(
  page: MailboxPage,
  request: MailboxLabRequest,
): MailboxPage {
  const { scenario } = request;
  if (scenario === "wrong_scope")
    return { ...page, connection_key: "other-company" };
  if (scenario === "short_page") return { ...page, items: page.items.slice(1) };
  if (scenario === "unverified_order") return { ...page, order: "unverified" };
  if (scenario === "anchor_changed")
    return {
      ...page,
      items: page.items.map((item, index) =>
        index === 0 ? { ...item, id: "new-first-message" } : item,
      ),
    };
  if (request.page !== 2) return page;
  if (
    (scenario === "transient_empty" && request.attempt === 1) ||
    scenario === "persistent_empty"
  )
    return { ...page, items: [] };
  if (scenario === "changed_total") return { ...page, total: page.total + 1 };
  if (scenario === "repeated_page")
    return { ...page, items: mailboxLabDataset().slice(0, 25) };
  if (scenario === "unsorted")
    return { ...page, items: [...page.items].reverse() };
  return page;
}

export function mailboxLabResponse(
  request: MailboxLabRequest,
  connectionKey: string,
  mailbox: MailboxKind,
): MailboxLabResponse {
  const failure = responseFailure(request);
  if (failure) return { status: failure, payload: null };
  const items = request.scenario === "empty" ? [] : mailboxLabDataset();
  const offset = (request.page - 1) * 25;
  const page: MailboxPage = {
    connection_key: connectionKey,
    mailbox,
    page: request.page,
    page_size: 25,
    total: items.length,
    start: items.length === 0 ? 1 : offset + 1,
    end: Math.min(offset + 25, items.length),
    order: "published_desc",
    items: items.slice(offset, offset + 25),
  };
  return { status: 200, payload: modifyPage(page, request) };
}
