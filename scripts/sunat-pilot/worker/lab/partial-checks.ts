import { readFile, writeFile } from "node:fs/promises";

import { createLocalMailboxSimulatorTransport } from "../repositories/local-simulator-transport";
import { runMonthlyMailboxQuery } from "../services/run-monthly-query";
import type { MailboxItem } from "../types/mailbox.types";
import { mailboxLabCheck, mailboxLabJob } from "./helpers";

export async function checkPartialMailboxRecovery(origin: string) {
  const recovered = new Map<string, MailboxItem>();
  const result = await runMonthlyMailboxQuery(mailboxLabJob(), {
    transport: createLocalMailboxSimulatorTransport(origin, "short_page"),
    checkpoints: {
      load: async () => null,
      save: async () => {
        throw new Error("INCOMPLETE_PAGE_MUST_NOT_COMMIT");
      },
      savePartial: async (_job, items) => {
        items.forEach((item) => recovered.set(item.id, item));
        await writeFile(
          "/results/partial-records.json",
          JSON.stringify([...recovered.values()]),
        );
      },
    },
  });
  const persisted: unknown = JSON.parse(
    await readFile("/results/partial-records.json", "utf8"),
  );
  let foreignSaved = false;
  await runMonthlyMailboxQuery(mailboxLabJob(), {
    transport: createLocalMailboxSimulatorTransport(origin, "wrong_scope"),
    checkpoints: {
      load: async () => null,
      save: async () => undefined,
      savePartial: async () => {
        foreignSaved = true;
      },
    },
  });
  return [
    mailboxLabCheck(
      "short_page_records_preserved_separately",
      Array.isArray(persisted) && persisted.length === 24,
    ),
    mailboxLabCheck(
      "repeated_partial_rows_deduplicated",
      recovered.size === 24,
    ),
    mailboxLabCheck(
      "partial_records_never_certify_coverage",
      result.reason === "PAGE_INCONSISTENT" &&
        result.checkpoint.next_page === 1 &&
        !result.last_success_may_advance,
    ),
    mailboxLabCheck("foreign_partial_rows_never_persisted", !foreignSaved),
  ];
}
