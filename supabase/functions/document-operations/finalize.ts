import { validateDocument } from "../_shared/validate-file.ts";
import { claimSchema } from "./contracts.ts";
import type { EdgeContext, UploadContext } from "./types/edge.types.ts";

async function downloadBytes(context: EdgeContext, bucket: string, path: string) {
  const result = await context.admin.storage.from(bucket).download(path);
  if (result.error || !result.data) throw new Error("FILE_MISSING");
  return new Uint8Array(await result.data.arrayBuffer());
}
async function promote(context: EdgeContext, upload: UploadContext, bytes: Uint8Array, mime: string, sha256: string) {
  const { intent, specs } = upload;
  const copied = await context.admin.storage.from(intent.final_bucket).upload(intent.final_path,bytes,{ contentType: mime, upsert: false, cacheControl: "0" });
  if (!copied.error) return;
  // A prior worker may have promoted the immutable object before its SQL failed.
  const previous = await downloadBytes(context,intent.final_bucket,intent.final_path);
  const validated = await validateDocument(previous,intent.original_name,intent.declared_bytes,specs);
  if (validated.sha256 !== sha256) throw new Error("CONFLICT");
}
export async function finalizeUpload(context: EdgeContext, intentId: string) {
  const claimed = await context.admin.rpc("h03_claim_upload",{ p_intent_id: intentId, p_actor_id: context.actorId, p_session_id: context.sessionId });
  if (claimed.error) throw new Error(claimed.error.message);
  const claim = claimSchema.parse(claimed.data);
  if (claim.status !== "claimed") return { status: claim.status, version_id: claim.version_id };
  if (!claim.intent || !claim.specs) throw new Error("DEPENDENCY_UNAVAILABLE");
  const upload = { intent: claim.intent, specs: claim.specs };
  try {
    const bytes = await downloadBytes(context,upload.intent.staging_bucket,upload.intent.staging_path);
    const validated = await validateDocument(bytes,upload.intent.original_name,upload.intent.declared_bytes,upload.specs);
    await promote(context,upload,bytes,validated.actual_mime,validated.sha256);
    const confirmed = await context.admin.rpc("h03_confirm_upload",{ p_intent_id: intentId, p_actor_id: context.actorId, p_session_id: context.sessionId, p_token: upload.intent.validation_token, p_validation: validated });
    if (confirmed.error) throw new Error(confirmed.error.message);
    return claimSchema.parse(confirmed.data);
  } catch (cause) {
    const known = cause instanceof Error && ["FILE_INVALID","FILE_TOO_LARGE","FILE_MISSING","CONFLICT"].includes(cause.message) ? cause.message : "DEPENDENCY_UNAVAILABLE";
    const released = await context.admin.rpc("h03_release_upload",{ p_intent_id: intentId, p_token: upload.intent.validation_token, p_error_code: known, p_rejected: ["FILE_INVALID","FILE_TOO_LARGE"].includes(known) });
    if (released.error) throw new Error("DEPENDENCY_UNAVAILABLE");
    throw new Error(known);
  }
}
