import { createClient } from "@supabase/supabase-js";
import { dispatchBatch } from "./dispatch.ts";
import type { Database } from "../../../src/lib/supabase/types/database.types.ts";

async function authorized(request: Request) {
  const expected = Deno.env.get("H06_DISPATCH_SECRET");
  const actual = request.headers.get("x-dispatch-key");
  if (!expected || expected.length < 32 || !actual) return false;
  const left = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(actual)));
  const right = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(expected)));
  return left.reduce((difference, value, index) => difference | (value ^ right[index]), 0) === 0;
}
Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return Response.json({ error: "VALIDATION_ERROR" }, { status: 405 });
  if (!await authorized(request)) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  try {
    const appBaseUrl = Deno.env.get("APP_BASE_URL") ?? "";
    const webhookUrl = Deno.env.get("N8N_WEBHOOK_URL") ?? "";
    const webhookToken = Deno.env.get("N8N_WEBHOOK_TOKEN") ?? "";
    const url = new URL(webhookUrl);
    const local = Deno.env.get("SUPABASE_URL") === "http://kong:8000" && url.protocol === "http:" && ["host.docker.internal", "tax-skill-h06-n8n"].includes(url.hostname);
    if (url.protocol !== "https:" && !local || webhookToken.length < 32) throw new Error("CONFIGURATION_ERROR");
    const admin = createClient<Database>(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const deadlines = await admin.rpc("h06_run_deadlines", {});
    const prepared = await admin.rpc("h06_prepare_digests", { p_base_url: appBaseUrl });
    if (deadlines.error || prepared.error) throw new Error("DEPENDENCY_UNAVAILABLE");
    const dispatched = await dispatchBatch(admin, { appBaseUrl, webhookUrl, webhookToken });
    return Response.json({ status: "completed", dispatch: dispatched }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "DEPENDENCY_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
});
