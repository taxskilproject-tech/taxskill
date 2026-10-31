import { join } from "node:path";

import { createFileMailboxCheckpoints } from "../repositories/file-checkpoints";
import { createLocalMailboxSimulatorTransport } from "../repositories/local-simulator-transport";
import { runMonthlyMailboxQuery } from "../services/run-monthly-query";
import type { MailboxLabScenario } from "../types/lab.types";
import type { MailboxJob } from "../types/mailbox.types";

export function mailboxLabJob(overrides: Partial<MailboxJob> = {}): MailboxJob {
  return {
    connection_key: "local-fixture-company",
    mailbox: "notifications",
    mode: "refresh",
    from: "2026-09-01",
    through: "2026-10-31",
    read_effect_consent: {
      accepted: true,
      warning_version: 1,
      accepted_at: "2026-10-26T10:00:00-05:00",
    },
    limits: {
      max_pages: 4,
      max_requests: 12,
      max_duration_ms: 5000,
      max_attempts_per_page: 3,
      request_timeout_ms: 500,
    },
    ...overrides,
  };
}

export function mailboxLabCheck(name: string, condition: boolean) {
  if (!condition) throw new Error("LAB_ASSERTION_FAILED: " + name);
  return { name, passed: true };
}

export async function runMailboxLabScenario(
  origin: string,
  scenario: MailboxLabScenario,
  overrides: Partial<MailboxJob> = {},
  directoryName: string = scenario,
) {
  const job = mailboxLabJob(overrides);
  const directory = join("/results/checkpoints", directoryName);
  const result = await runMonthlyMailboxQuery(job, {
    transport: createLocalMailboxSimulatorTransport(origin, scenario),
    checkpoints: createFileMailboxCheckpoints(directory),
  });
  return { result, job, directory };
}
