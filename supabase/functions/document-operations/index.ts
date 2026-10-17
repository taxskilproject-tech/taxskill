import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { bodySchema } from "./contracts.ts";
import { finalizeUpload } from "./finalize.ts";
import { cleanupStaging, downloadVersion, prepareUpload } from "./operations.ts";
import type { EdgeContext } from "./types/edge.types.ts";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cleanup-key", "Access-Control-Allow-Methods": "POST, OPTIONS", "Cache-Control": "no-store" };
function respond(body: unknown, status = 200) { return Response.json(body,{ status, headers: CORS }); }
async function authenticate(request: Request, admin: EdgeContext["admin"]): Promise<EdgeContext> {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) throw new Error("UNAUTHENTICATED");
  const user = createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{ global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const verified = await user.auth.getUser();
  const claims = await user.auth.getClaims(authorization.slice(7));
  if (verified.error || !verified.data.user || claims.error || !claims.data) throw new Error("UNAUTHENTICATED");
  const sessionId = z.uuid().parse(claims.data.claims.session_id);
  return { user, admin, actorId: verified.data.user.id, sessionId };
}
async function verifyCleanup(request: Request) {
  const expected = Deno.env.get("H03_CLEANUP_SECRET");
  const actual = request.headers.get("x-cleanup-key");
  if (!expected || !actual || actual.length!==expected.length) throw new Error("FORBIDDEN");
  const left = new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(actual)));
  const right = new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(expected)));
  if (left.reduce((difference,value,index) => difference | (value ^ right[index]),0)!==0) throw new Error("FORBIDDEN");
}
Deno.serve(async (request: Request) => {
  if (request.method==="OPTIONS") return new Response(null,{ headers: CORS });
  if (request.method!=="POST") return respond({ ok: false, error: { code: "VALIDATION_ERROR" } },405);
  try {
    const raw = await request.text();
    if (raw.length>4000) throw new Error("VALIDATION_ERROR");
    const body = bodySchema.parse(JSON.parse(raw));
    const admin = createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{ auth: { persistSession: false } });
    if (body.action==="cleanup") { await verifyCleanup(request); return respond({ ok: true, data: await cleanupStaging(admin) }); }
    const context = await authenticate(request,admin);
    if (body.action==="download") return respond({ ok: true, data: await downloadVersion(context,body) });
    if (!body.intent_id) throw new Error("VALIDATION_ERROR");
    await context.user.rpc("h03_upload_context",{ p_intent_id: body.intent_id }).then(({error}) => { if (error) throw new Error(error.message); });
    const result = body.action==="prepare" ? await prepareUpload(context,body.intent_id) : await finalizeUpload(context,body.intent_id);
    return respond({ ok: true, data: result });
  } catch (cause) {
    const known = cause instanceof Error && ["UNAUTHENTICATED","FORBIDDEN","NOT_FOUND","CONFLICT","VALIDATION_ERROR","FILE_INVALID","FILE_TOO_LARGE","FILE_MISSING","STORAGE_LIMIT_INCOMPATIBLE"].includes(cause.message) ? cause.message : "DEPENDENCY_UNAVAILABLE";
    return respond({ ok: false, error: { code: known } }, known==="UNAUTHENTICATED" ? 401 : known==="FORBIDDEN" ? 403 : known==="CONFLICT" ? 409 : 400);
  }
});
