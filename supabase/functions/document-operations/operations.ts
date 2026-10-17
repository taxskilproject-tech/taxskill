import { z } from "zod";
import { cleanupSchema, uploadContextSchema } from "./contracts.ts";
import type { EdgeBody, EdgeContext } from "./types/edge.types.ts";
import { resolveStorageDownloadUrl } from "./utils/resolve-storage-download-url.ts";

export async function prepareUpload(context: EdgeContext, intentId: string) {
  const checked = await context.user.rpc("h03_upload_context",{ p_intent_id: intentId });
  if (checked.error) throw new Error(checked.error.message);
  const { intent, specs } = uploadContextSchema.parse(checked.data);
  if (!["reserved","uploaded"].includes(intent.state) || new Date(intent.expires_at).getTime()<=Date.now()) throw new Error("CONFLICT");
  const buckets = await Promise.all([intent.staging_bucket,intent.final_bucket].map(id => context.admin.storage.getBucket(id)));
  if (buckets.some(result => result.error || !result.data)) throw new Error("DEPENDENCY_UNAVAILABLE");
  if (buckets.some(result => result.data?.file_size_limit && result.data.file_size_limit<specs.max_file_bytes)) throw new Error("STORAGE_LIMIT_INCOMPATIBLE");
  const signed = await context.admin.storage.from(intent.staging_bucket).createSignedUploadUrl(intent.staging_path,{ upsert: false });
  if (signed.error || !signed.data) throw new Error("DEPENDENCY_UNAVAILABLE");
  return { token: signed.data.token, bucket: intent.staging_bucket, path: intent.staging_path };
}
export async function downloadVersion(context: EdgeContext, body: EdgeBody) {
  if (!body.organization_id || !body.version_id || !body.request_id) throw new Error("VALIDATION_ERROR");
  const authorized = await context.user.rpc("h03_command",{ p_organization_id: body.organization_id, p_request_id: body.request_id, p_operation: "RequestDownload", p_input: { version_id: body.version_id } });
  const result = z.object({ ok: z.boolean(), error: z.object({ code: z.string() }).optional() }).parse(authorized.data);
  if (authorized.error || !result.ok) throw new Error(result.error?.code ?? "FORBIDDEN");
  const version = await context.admin.from("document_versions").select("storage_bucket,storage_path,original_name,extension").eq("id",body.version_id).eq("organization_id",body.organization_id).single();
  if (version.error || !version.data) throw new Error("NOT_FOUND");
  const signed = await context.admin.storage.from(version.data.storage_bucket).createSignedUrl(version.data.storage_path,60);
  if (signed.error || !signed.data) throw new Error("DEPENDENCY_UNAVAILABLE");
  const publicBase = Deno.env.get("H03_PUBLIC_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL");
  if (!publicBase) throw new Error("DEPENDENCY_UNAVAILABLE");
  const url = resolveStorageDownloadUrl(signed.data.signedUrl, publicBase);
  return { url, expires_in: 60, original_name: version.data.original_name, extension: version.data.extension };
}
export async function cleanupStaging(admin: EdgeContext["admin"]) {
  const expired = await admin.rpc("h03_expire_uploads");
  if (expired.error) throw new Error("DEPENDENCY_UNAVAILABLE");
  const entries = cleanupSchema.parse(expired.data);
  for (const entry of entries) {
    const removed = await admin.storage.from(entry.staging_bucket).remove([entry.staging_path]);
    if (removed.error) throw new Error("DEPENDENCY_UNAVAILABLE");
    const marked = await admin.rpc("h03_mark_staging_cleaned",{ p_intent_ids: [entry.id] });
    if (marked.error) throw new Error("DEPENDENCY_UNAVAILABLE");
  }
  return { cleaned_count: entries.length };
}
