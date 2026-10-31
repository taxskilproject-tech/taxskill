import { z } from "zod";

import { getLimaDate } from "@/domain/time/utils/instant";

import type { SunatFilters } from "../types/ui.types";

export function parseSunatFilters(
  parameters: URLSearchParams,
  now: Date,
): SunatFilters {
  const local = getLimaDate(now);
  if (!local.ok) throw new Error("LOCAL_DATE_UNAVAILABLE");
  const year = Number(parameters.get("year") ?? local.data.slice(0, 4));
  const month = Number(parameters.get("month") ?? local.data.slice(5, 7));
  const page = Number(parameters.get("page") ?? 1);
  const mailbox = parameters.get("mailbox");
  const message = z.uuid().safeParse(parameters.get("messageId"));
  return {
    year:
      Number.isInteger(year) && year >= 1990 && year <= 2200
        ? year
        : Number(local.data.slice(0, 4)),
    month:
      Number.isInteger(month) && month >= 1 && month <= 12
        ? month
        : Number(local.data.slice(5, 7)),
    page: Number.isInteger(page) && page >= 1 && page <= 100000 ? page : 1,
    mailbox:
      mailbox === "notifications" || mailbox === "messages" ? mailbox : "all",
    q: (parameters.get("q") ?? "").slice(0, 150),
    messageId: message.success ? message.data : null,
  };
}

export function sunatFilterDestination(
  current: URLSearchParams,
  changes: Record<string, string>,
): string {
  const next = new URLSearchParams(current);
  for (const [name, value] of Object.entries(changes)) {
    if (value) next.set(name, value);
    else next.delete(name);
  }
  if (
    ["year", "month", "mailbox", "q"].some((name) =>
      Object.hasOwn(changes, name),
    )
  ) {
    next.delete("page");
    next.delete("messageId");
  }
  return "/buzon-sunat?" + next.toString();
}
