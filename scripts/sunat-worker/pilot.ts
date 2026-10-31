import { createHash } from "node:crypto";

import { runMonthlyMailboxQuery } from "../sunat-pilot/worker/services/run-monthly-query";
import type { MailboxKind } from "../sunat-pilot/worker/types/mailbox.types";
import { writePilotReport } from "./repositories/pilot-report";
import {
  pageFingerprint,
  pilotFirstPage,
  verifyReadEffect,
  verifySessionRenewal,
} from "./services/pilot-checks";
import { loadAuthorizedPilot } from "./services/pilot-input";
import { OfficialSunatSource } from "./source/sunat-source";
import type { PilotPeriodSummary, PilotReportState } from "./types/pilot.types";
import { containerMetrics } from "./utils/container-metrics";
import { pilotFailureCode } from "./utils/pilot-failure";
import { pilotMonthWindow } from "./utils/pilot-month";

async function readPilotPeriod(
  source: OfficialSunatSource,
  month: string,
  mailbox: MailboxKind,
  connectionKey: string,
) {
  const recovered = new Set<string>();
  const result = await runMonthlyMailboxQuery(
    {
      connection_key: connectionKey,
      mailbox,
      ...pilotMonthWindow(month),
      read_effect_consent: {
        accepted: true,
        warning_version: 1,
        accepted_at: new Date().toISOString(),
      },
      limits: {
        max_pages: 20,
        max_requests: 20,
        max_duration_ms: 45000,
        max_attempts_per_page: 2,
        request_timeout_ms: 15000,
      },
    },
    {
      transport: source,
      checkpoints: {
        load: async () => null,
        save: async () => undefined,
        savePartial: async (_job, items) => {
          items.forEach((item) => recovered.add(item.id));
        },
      },
    },
  );
  return {
    mailbox,
    month,
    status: result.status,
    reason: result.reason,
    count: result.checkpoint.items.length,
    available_count: new Set([
      ...result.checkpoint.items.map((item) => item.id),
      ...recovered,
    ]).size,
    metrics: result.metrics,
  };
}
async function downloadPilotReference(
  source: OfficialSunatSource,
  months: readonly string[],
) {
  const record = [...source.records].find(
    ([, item]) =>
      item.has_attachments && months.includes(item.published_on.slice(0, 7)),
  );
  if (!record) return null;
  const mailbox = record[0].startsWith("notifications:")
    ? "notifications"
    : "messages";
  const detail = await source.details(mailbox, record[1].id);
  if (!detail.attachments[0]) return null;
  const file = await source.attachment(detail.attachments[0].locator);
  return {
    bytes: file.bytes.length,
    sha256: createHash("sha256").update(file.bytes).digest("hex"),
    mime: file.mime,
  };
}

async function main() {
  const { input, credentials } = loadAuthorizedPilot();
  const scope = input.scope;
  const source = new OfficialSunatSource();
  let results: PilotPeriodSummary[] = [];
  const started = Date.now();
  const cpu = process.cpuUsage();
  let report: PilotReportState = {
    schema_version: 2,
    authorized_live: true,
    pilot_reference: input.pilot_reference,
    current_stage: "connecting",
    last_completed_stage: null,
    run_finished: false,
    verified_identity: false,
    query_and_attachment_complete: false,
    source_validated: false,
    stable_ids: null,
    read_effect: null,
    session: null,
    results,
    attachment: null,
    failure: null,
    cleanup: "pending",
    cleanup_error: null,
  };
  function save(patch: Partial<PilotReportState>) {
    report = { ...report, ...patch };
    const usage = process.cpuUsage(cpu);
    writePilotReport({
      ...report,
      metrics: {
        duration_ms: Date.now() - started,
        cpu_ms: (usage.user + usage.system) / 1000,
        max_rss_mb: process.resourceUsage().maxRSS / 1024,
        requests: source.requestCount(),
        container: containerMetrics(),
      },
    });
  }
  const deadline = setTimeout(() => {
    void source.close().catch(() =>
      console.error(
        JSON.stringify({
          event: "pilot_cleanup_failed",
          code: "PILOT_CLEANUP_FAILED",
        }),
      ),
    );
  }, 240000);
  try {
    save({});
    await source.connect(credentials);
    save({
      verified_identity: true,
      last_completed_stage: "connecting",
      current_stage: "identity",
    });
    console.log(
      JSON.stringify({ event: "pilot_connected", verified_identity: true }),
    );
    const connectionKey = scope.connection_id;
    const initial = await pilotFirstPage(source, connectionKey);
    const stableIds =
      initial.items.length > 0 &&
      pageFingerprint(initial) ===
        pageFingerprint(await pilotFirstPage(source, connectionKey));
    save({
      stable_ids: stableIds,
      last_completed_stage: "identity",
      current_stage: "periods",
    });
    const combinations = input.months.flatMap((month) =>
      (["notifications", "messages"] satisfies MailboxKind[]).map(
        (mailbox) => ({ month, mailbox }),
      ),
    );
    for (const item of combinations) {
      const summary = await readPilotPeriod(
        source,
        item.month,
        item.mailbox,
        connectionKey,
      );
      results = [...results, summary];
      save({ results });
    }
    save({ last_completed_stage: "periods", current_stage: "attachment" });
    const attachment = await downloadPilotReference(source, input.months);
    const complete =
      results.length === combinations.length &&
      results.every((item) => item.status === "complete") &&
      Boolean(attachment);
    save({
      attachment,
      query_and_attachment_complete: complete,
      last_completed_stage: "attachment",
      current_stage: "read_effect",
    });
    const readEffect = await verifyReadEffect(
      source,
      input.months,
      connectionKey,
    );
    save({
      read_effect: readEffect,
      last_completed_stage: "read_effect",
      current_stage: "renewal",
    });
    const renewal = await verifySessionRenewal(source, initial, connectionKey);
    save({
      session: renewal,
      last_completed_stage: "renewal",
      current_stage: "finished",
      run_finished: true,
    });
    process.exitCode = complete ? 0 : 2;
    console.log(
      JSON.stringify({
        event: "pilot_finished",
        periods: results.map(({ mailbox, month, status, reason, count }) => ({
          mailbox,
          month,
          status,
          reason,
          count,
        })),
        attachment_downloaded: Boolean(attachment),
      }),
    );
  } catch (error) {
    save({
      failure: { stage: report.current_stage, code: pilotFailureCode(error) },
      run_finished: false,
    });
    throw error;
  } finally {
    clearTimeout(deadline);
    try {
      await source.close();
    } catch {
      save({
        cleanup: "failed",
        cleanup_error: "PILOT_CLEANUP_FAILED",
        run_finished: false,
        failure: report.failure ?? {
          stage: report.current_stage,
          code: "PILOT_CLEANUP_FAILED",
        },
      });
      throw new Error("PILOT_CLEANUP_FAILED");
    }
    save({ cleanup: "closed" });
  }
}
export const pilotRun = main().catch((error: unknown) => {
  const code = pilotFailureCode(error);
  console.error(JSON.stringify({ event: "pilot_failed", code }));
  process.exitCode = 1;
});
