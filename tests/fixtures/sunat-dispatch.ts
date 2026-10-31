import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import { sunatDispatcherEnvironmentSchema } from "../../src/features/sunat-mailbox/contracts/dispatch.schema";
import type { Database } from "../../src/lib/supabase/types/database.types";
import { sunatWorkerClaimFixture } from "./sunat-worker";

export function sunatDispatchFixture() {
  const requests: unknown[] = [];
  const client = createClient<Database>(
    "http://127.0.0.1:54431",
    "fixture-only",
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async (_input, init) => {
          if (typeof init?.body === "string")
            requests.push(JSON.parse(init.body));
          return new Response("true", {
            headers: { "content-type": "application/json" },
          });
        },
      },
    },
  );
  return {
    client,
    requests,
    ticket: { run_id: randomUUID(), claim: sunatWorkerClaimFixture() },
    config: sunatDispatcherEnvironmentSchema.parse({
      SUNAT_EXECUTION_MODE: "vercel",
      SUNAT_SOURCE_VALIDATED: "true",
      SUNAT_SANDBOX_IMAGE: "taxskill-sunat-worker@sha256:" + "a".repeat(64),
      SUNAT_CREDENTIALS_CURRENT_KEY: "fixture",
      SUNAT_CREDENTIALS_KEYS: JSON.stringify({ fixture: "ab".repeat(32) }),
    }),
  };
}
