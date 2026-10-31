import { createClient } from "@supabase/supabase-js";

import type { Database } from "../../src/lib/supabase/types/database.types";
import type { SunatStatusFixtureOptions } from "./types/sunat-status.types";

export function sunatStatusClient(options: SunatStatusFixtureOptions) {
  const requests: URL[] = [];
  const client = createClient<Database>(
    "http://127.0.0.1:54431",
    "fixture-only",
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async (input) => {
          const url = new URL(
            typeof input === "string"
              ? input
              : input instanceof URL
                ? input.href
                : input.url,
          );
          if (url.origin !== "http://127.0.0.1:54431")
            throw new Error("FIXTURE_REMOTE_FORBIDDEN");
          requests.push(url);
          const headers = { "content-type": "application/json" };
          if (url.pathname.endsWith("h10_worker_heartbeat"))
            return new Response(JSON.stringify(options.heartbeat ?? true), {
              headers,
            });
          if (url.pathname.endsWith("h10_worker_finish"))
            return new Response(JSON.stringify(options.finish), { headers });
          if (url.pathname.endsWith("h10_worker_abandon"))
            return new Response(JSON.stringify(options.abandon), { headers });
          if (url.pathname !== "/rest/v1/sunat_jobs")
            throw new Error("FIXTURE_REQUEST_UNEXPECTED");
          return new Response(
            JSON.stringify(
              options.retainedState ? [{ state: options.retainedState }] : [],
            ),
            { headers, status: options.queryFails ? 400 : 200 },
          );
        },
      },
    },
  );
  return { client, requests };
}
