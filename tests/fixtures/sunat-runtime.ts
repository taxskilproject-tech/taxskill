import { claimedJobSchema } from "../../scripts/sunat-worker/contracts/worker.schema";
import type {
  SourceRecord,
  SunatSource,
} from "../../scripts/sunat-worker/types/source.types";
import { sunatStatusClient } from "./sunat-status";
import {
  sunatWorkerClaimFixture,
  sunatWorkerFixtureKeys,
} from "./sunat-worker";
import type { SunatRuntimeFixtureOptions } from "./types/sunat-runtime.types";

export function sunatRuntimeFixture(options: SunatRuntimeFixtureOptions = {}) {
  const base = sunatWorkerClaimFixture();
  const claim = claimedJobSchema.parse({
    ...base,
    job: { ...base.job, kind: "verify", from_date: null, through_date: null },
  });
  const connection = Promise.withResolvers<void>();
  if (options.connected) connection.resolve();
  let closes = 0;
  const source: SunatSource = {
    records: new Map<string, SourceRecord>(),
    connect: () => connection.promise,
    close: async () => {
      closes += 1;
      if (options.closeFails) throw new Error("Private fixture detail");
      if (options.closeHangs) await new Promise<void>(() => undefined);
    },
    readPage: async () => {
      throw new Error("PAGE_NOT_REQUESTED");
    },
    details: async () => ({ text: "", attachments: [] }),
    attachment: async () => {
      throw new Error("FILE_NOT_REQUESTED");
    },
    renewSession: async () => undefined,
    requestCount: () => 0,
  };
  const { client, requests } = sunatStatusClient({
    finish: true,
    abandon: true,
    heartbeat: options.heartbeat,
  });
  return {
    claim,
    source,
    client,
    requests,
    connection,
    keys: sunatWorkerFixtureKeys(),
    closeCount: () => closes,
  };
}
