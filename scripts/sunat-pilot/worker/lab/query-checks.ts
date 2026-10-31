import type { MailboxLabCheck } from "../types/lab.types";
import {
  mailboxLabCheck,
  mailboxLabJob,
  runMailboxLabScenario,
} from "./helpers";

export async function checkMailboxQueries(
  origin: string,
): Promise<MailboxLabCheck[]> {
  const checks: MailboxLabCheck[] = [];
  const normal = (await runMailboxLabScenario(origin, "normal")).result;
  checks.push(
    mailboxLabCheck("monthly_window_complete", normal.status === "complete"),
  );
  checks.push(
    mailboxLabCheck(
      "both_months_reconciled",
      normal.checkpoint.items.length === 45,
    ),
  );
  checks.push(
    mailboxLabCheck(
      "older_history_not_fetched",
      normal.metrics.pages_read === 2,
    ),
  );
  checks.push(
    mailboxLabCheck(
      "success_advances_only_after_completion",
      normal.last_success_may_advance,
    ),
  );
  const empty = (await runMailboxLabScenario(origin, "empty")).result;
  checks.push(
    mailboxLabCheck(
      "certified_empty_requires_consistent_source",
      empty.status === "complete" && empty.checkpoint.items.length === 0,
    ),
  );
  const temporary = (await runMailboxLabScenario(origin, "transient_empty"))
    .result;
  checks.push(
    mailboxLabCheck(
      "transient_empty_page_recovers",
      temporary.status === "complete" && temporary.metrics.request_count === 3,
    ),
  );
  const missing = (await runMailboxLabScenario(origin, "persistent_empty"))
    .result;
  checks.push(
    mailboxLabCheck(
      "counter_without_rows_is_partial",
      missing.status === "partial" && missing.reason === "PAGE_INCONSISTENT",
    ),
  );
  checks.push(
    mailboxLabCheck(
      "bad_page_does_not_advance_cursor",
      missing.checkpoint.next_page === 2 && !missing.last_success_may_advance,
    ),
  );
  checks.push(
    mailboxLabCheck("retries_are_bounded", missing.metrics.request_count === 4),
  );
  const short = (await runMailboxLabScenario(origin, "short_page")).result;
  checks.push(
    mailboxLabCheck(
      "twenty_four_of_twenty_five_rejected",
      short.status === "partial" && short.checkpoint.items.length === 0,
    ),
  );
  const wrong = (await runMailboxLabScenario(origin, "wrong_scope")).result;
  checks.push(
    mailboxLabCheck(
      "foreign_company_page_rejected",
      wrong.reason === "UNEXPECTED_RESPONSE" &&
        wrong.checkpoint.items.length === 0,
    ),
  );
  const changed = (await runMailboxLabScenario(origin, "changed_total")).result;
  checks.push(
    mailboxLabCheck(
      "moving_total_requires_attention",
      changed.status === "requires_attention" &&
        changed.reason === "SOURCE_CHANGED",
    ),
  );
  const duplicate = (await runMailboxLabScenario(origin, "repeated_page"))
    .result;
  checks.push(
    mailboxLabCheck(
      "repeated_page_is_not_appended",
      duplicate.reason === "SOURCE_CHANGED" &&
        duplicate.checkpoint.items.length === 25,
    ),
  );
  const disorder = (await runMailboxLabScenario(origin, "unsorted")).result;
  checks.push(
    mailboxLabCheck(
      "descending_order_must_hold",
      disorder.reason === "PAGE_INCONSISTENT",
    ),
  );
  const unordered = (await runMailboxLabScenario(origin, "unverified_order"))
    .result;
  checks.push(
    mailboxLabCheck(
      "unverified_order_cannot_stop_at_date",
      unordered.status === "complete" && unordered.metrics.pages_read === 3,
    ),
  );
  const base = mailboxLabJob();
  const bounded = (
    await runMailboxLabScenario(
      origin,
      "normal",
      {
        limits: { ...base.limits, max_requests: 1 },
      },
      "request-limit",
    )
  ).result;
  checks.push(
    mailboxLabCheck(
      "request_budget_preserves_partial",
      bounded.reason === "BUDGET_EXHAUSTED" &&
        bounded.metrics.request_count === 1,
    ),
  );
  return checks;
}
