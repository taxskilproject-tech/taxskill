import { assertLocalMailboxSimulator } from "../repositories/local-simulator-transport";
import { mailboxFailureCode } from "../services/mailbox-error";
import { runMonthlyMailboxQuery } from "../services/run-monthly-query";
import type { MailboxLabCheck } from "../types/lab.types";
import { dailyMailboxWindow } from "../utils/daily-window";
import {
  mailboxLabCheck,
  mailboxLabJob,
  runMailboxLabScenario,
} from "./helpers";

function remoteTargetRejected(): boolean {
  try {
    assertLocalMailboxSimulator("https://gzwrqvqofcrdjvzoblaz.supabase.co");
    return false;
  } catch {
    return true;
  }
}

export async function checkMailboxSessions(
  origin: string,
): Promise<MailboxLabCheck[]> {
  const checks: MailboxLabCheck[] = [];
  checks.push(
    mailboxLabCheck("cloud_refused_before_network", remoteTargetRejected()),
  );
  const expired = (await runMailboxLabScenario(origin, "expired_once")).result;
  checks.push(
    mailboxLabCheck(
      "expired_session_renews_once",
      expired.status === "complete" && expired.metrics.session_renewals === 1,
    ),
  );
  checks.push(
    mailboxLabCheck(
      "renewal_counted_in_request_budget",
      expired.metrics.request_count === 4,
    ),
  );
  const looping = (await runMailboxLabScenario(origin, "expired_always"))
    .result;
  checks.push(
    mailboxLabCheck(
      "session_expiry_never_loops",
      looping.reason === "SESSION_EXPIRED" &&
        looping.metrics.session_renewals === 1 &&
        looping.metrics.request_count === 3,
    ),
  );
  const invalid = (await runMailboxLabScenario(origin, "invalid_credentials"))
    .result;
  checks.push(
    mailboxLabCheck(
      "invalid_password_not_retried",
      invalid.reason === "CREDENTIAL_REJECTED" &&
        invalid.metrics.request_count === 1 &&
        invalid.metrics.session_renewals === 0,
    ),
  );
  const captcha = (await runMailboxLabScenario(origin, "captcha")).result;
  checks.push(
    mailboxLabCheck(
      "captcha_requires_human_intervention",
      captcha.status === "requires_attention" &&
        captcha.reason === "VERIFICATION_REQUIRED" &&
        captcha.metrics.request_count === 1,
    ),
  );
  const down = (await runMailboxLabScenario(origin, "unavailable")).result;
  checks.push(
    mailboxLabCheck(
      "unavailable_is_never_an_empty_success",
      down.status === "partial" &&
        !down.last_success_may_advance &&
        down.metrics.request_count === 3,
    ),
  );
  const base = mailboxLabJob();
  const timeout = (
    await runMailboxLabScenario(origin, "timeout", {
      limits: { ...base.limits, request_timeout_ms: 40, max_duration_ms: 1500 },
    })
  ).result;
  checks.push(
    mailboxLabCheck(
      "hung_page_aborts_with_cursor_preserved",
      timeout.status === "partial" &&
        timeout.checkpoint.next_page === 2 &&
        timeout.metrics.request_count <= 4,
    ),
  );
  let withoutConsent = false;
  try {
    await runMonthlyMailboxQuery(
      { ...base, read_effect_consent: null },
      {
        transport: {
          readPage: async () => {
            throw new Error("MUST_NOT_RUN");
          },
          renewSession: async () => {
            throw new Error("MUST_NOT_RUN");
          },
        },
        checkpoints: { load: async () => null, save: async () => undefined },
      },
    );
  } catch (error) {
    withoutConsent = mailboxFailureCode(error) === "CONSENT_REQUIRED";
  }
  checks.push(
    mailboxLabCheck(
      "read_effect_consent_required_before_requests",
      withoutConsent,
    ),
  );
  const window = dailyMailboxWindow("2026-10-25", "2026-10-26");
  checks.push(
    mailboxLabCheck(
      "daily_window_starts_at_last_successful_day",
      window.from === "2026-10-25" && window.through === "2026-10-26",
    ),
  );
  const daily = (await runMailboxLabScenario(origin, "normal", window, "daily"))
    .result;
  checks.push(
    mailboxLabCheck(
      "daily_query_skips_old_history",
      daily.status === "complete" &&
        daily.metrics.pages_read === 1 &&
        daily.checkpoint.items.every(
          (item) => item.published_on >= window.from,
        ),
    ),
  );
  return checks;
}
