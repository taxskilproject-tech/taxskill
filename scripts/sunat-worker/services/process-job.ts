import { createHash } from "node:crypto";

import { SUNAT_BUCKET } from "../../../src/domain/sunat/constants/sunat";
import { asJson } from "../../../src/lib/supabase/utils/as-json";
import type {
  ClaimedSunatJob,
  WorkerCompletion,
  WorkerDependencies,
} from "../types/worker.types";
import { processMailboxes } from "./process-mailboxes";

async function processAttachment(
  claim: ClaimedSunatJob,
  dependencies: WorkerDependencies,
): Promise<void> {
  const { client, source } = dependencies;
  const args = { p_job_id: claim.job.id, p_lease_token: claim.job.lease_token };
  if (!claim.attachment || !claim.message)
    throw new Error("UNEXPECTED_RESPONSE");
  await source.details(claim.message.mailbox, claim.message.source_id);
  const file = await source.attachment(claim.attachment.locator);
  const sha256 = createHash("sha256").update(file.bytes).digest("hex");
  const object = `${claim.job.organization_id}/${claim.job.connection_id}/${claim.attachment.id}/${sha256}`;
  const upload = await client.storage
    .from(SUNAT_BUCKET)
    .upload(object, file.bytes, { contentType: file.mime, upsert: false });
  if (upload.error && upload.error.message !== "The resource already exists")
    throw new Error("STORAGE_UNAVAILABLE");
  const committed = await client.rpc("h10_worker_attachment", {
    ...args,
    p_input: {
      object_name: object,
      sha256,
      byte_size: file.bytes.length,
      mime_type: file.mime,
    },
  });
  if (!committed.error && committed.data) return;
  if (!upload.error) {
    const cleanup = await client.storage.from(SUNAT_BUCKET).remove([object]);
    if (cleanup.error) throw new Error("STORAGE_CLEANUP_REQUIRED");
  }
  throw new Error("ACCESS_REVOKED");
}

export async function processSunatJob(
  claim: ClaimedSunatJob,
  dependencies: WorkerDependencies,
): Promise<WorkerCompletion> {
  if (claim.job.kind === "monthly" || claim.job.kind === "daily")
    return processMailboxes(claim, dependencies);
  if (claim.job.kind === "attachment")
    await processAttachment(claim, dependencies);
  if (claim.job.kind === "message" && claim.message) {
    const detail = await dependencies.source.details(
      claim.message.mailbox,
      claim.message.source_id,
    );
    const response = await dependencies.client.rpc("h10_worker_details", {
      p_job_id: claim.job.id,
      p_lease_token: claim.job.lease_token,
      p_text: detail.text,
      p_attachments: asJson(detail.attachments),
    });
    if (response.error || !response.data) throw new Error("ACCESS_REVOKED");
  }
  return { state: "complete", error: null, results: [], metrics: {} };
}
