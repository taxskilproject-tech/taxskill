import { getPublicEnvironment } from "@/config/env/public-env";
import {
  TUS_CHUNK_BYTES,
  UPLOAD_RETRIES,
} from "@/domain/documents/constants/documents";
import { signedUploadSchema } from "@/domain/documents/contracts/document.schema";
import type { UploadTransfer } from "@/domain/documents/types/document.types";
import { invokeDocumentEdge } from "@/features/documents/repositories/document.repository";
import { normalizeUploadError } from "@/features/documents/utils/upload-error";

export async function transferDocument({
  file,
  intent,
  signal,
  onProgress,
}: UploadTransfer) {
  signal.throwIfAborted();
  const signed = await invokeDocumentEdge(
    { action: "prepare", intent_id: intent.id },
    signedUploadSchema,
    signal,
  );
  const environment = getPublicEnvironment();
  if (!environment.ok) throw environment.error;
  const { Upload } = await import("tus-js-client");
  const endpoint = new URL(environment.data.supabaseUrl);
  if (endpoint.hostname.endsWith(".supabase.co"))
    endpoint.hostname = endpoint.hostname.replace(
      ".supabase.co",
      ".storage.supabase.co",
    );
  endpoint.pathname = "/storage/v1/upload/resumable/sign";
  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: endpoint.href,
      chunkSize: TUS_CHUNK_BYTES,
      retryDelays: UPLOAD_RETRIES,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      headers: {
        apikey: environment.data.publishableKey,
        "x-signature": signed.token,
      },
      metadata: {
        bucketName: signed.bucket,
        objectName: signed.path,
        contentType: file.type || "application/octet-stream",
        cacheControl: "0",
      },
      fingerprint: async () =>
        `h03:${intent.id}:${file.name}:${file.size}:${file.lastModified}`,
      onProgress: (sent, total) => onProgress(Math.round((sent / total) * 100)),
      onError: (cause) => {
        signal.removeEventListener("abort", cancel);
        reject(normalizeUploadError(cause));
      },
      onSuccess: () => {
        signal.removeEventListener("abort", cancel);
        resolve();
      },
    });
    function cancel() {
      void upload
        .abort()
        .then(
          () => reject(new DOMException("Carga interrumpida", "AbortError")),
          reject,
        );
    }
    signal.addEventListener("abort", cancel, { once: true });
    upload
      .findPreviousUploads()
      .then((previous) => {
        if (previous[0]) upload.resumeFromPreviousUpload(previous[0]);
        if (signal.aborted) {
          cancel();
          return;
        }
        upload.start();
      })
      .catch(reject);
  });
}
