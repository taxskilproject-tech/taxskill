import { VALIDATION_DELAYS } from "@/domain/documents/constants/documents";
import {
  finalizationSchema,
  intentSchema,
} from "@/domain/documents/contracts/document.schema";
import type {
  UploadExecution,
  UploadIntent,
} from "@/domain/documents/types/document.types";
import {
  invokeDocumentEdge,
  loadUploadIntent,
} from "@/features/documents/repositories/document.repository";
import { transferDocument } from "@/features/documents/repositories/upload.repository";

async function waitForValidation(intent: UploadIntent, signal: AbortSignal) {
  for (const delay of VALIDATION_DELAYS) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(done, delay);
      function done() {
        signal.removeEventListener("abort", cancel);
        resolve();
      }
      function cancel() {
        clearTimeout(timer);
        reject(new DOMException("Interrumpido", "AbortError"));
      }
      signal.addEventListener("abort", cancel, { once: true });
      if (signal.aborted) cancel();
    });
    const current = await loadUploadIntent(intent.id, signal);
    if (current.state === "ready") return;
    if (["rejected", "conflict", "expired"].includes(current.state))
      throw { code: current.error_code ?? "VALIDATION_ERROR" };
  }
  throw {
    code: "DEPENDENCY_UNAVAILABLE",
    message:
      "La validación sigue en curso. Consulta la intención antes de volver a cargar.",
  };
}
async function finalize(intent: UploadIntent, signal: AbortSignal) {
  const result = await invokeDocumentEdge(
    { action: "finalize", intent_id: intent.id },
    finalizationSchema,
    signal,
  );
  if (result.status === "processing") await waitForValidation(intent, signal);
}
async function tryRecoveredUpload(
  intent: UploadIntent,
  signal: AbortSignal,
  file: File | null,
) {
  try {
    await finalize(intent, signal);
    return true;
  } catch (cause) {
    const missing =
      cause &&
      typeof cause === "object" &&
      "code" in cause &&
      cause.code === "FILE_MISSING";
    if (!missing || !file) throw cause;
    return false;
  }
}
export async function executeUpload({
  file,
  deliverable,
  cycle,
  recovery,
  signal,
  onProgress,
  reserve,
}: UploadExecution) {
  signal.throwIfAborted();
  onProgress({ phase: "reserving", percent: 0 });
  let intent = recovery;
  if (!intent) {
    if (!file) throw { code: "VALIDATION_ERROR" };
    const result = await reserve({
      deliverable_id: deliverable.id,
      cycle_id: cycle.id,
      expected_revision: deliverable.revision,
      original_name: file.name,
      declared_bytes: file.size,
      declared_mime: file.type,
    });
    signal.throwIfAborted();
    intent = intentSchema.parse(
      await loadUploadIntent(result.resource_id, signal),
    );
  }
  if (recovery) {
    onProgress({ phase: "validating", percent: 100 });
    if (await tryRecoveredUpload(intent, signal, file)) return;
  }
  if (
    !file ||
    file.name !== intent.original_name ||
    file.size !== intent.declared_bytes
  )
    throw { code: "VALIDATION_ERROR" };
  signal.throwIfAborted();
  onProgress({ phase: "uploading", percent: 0 });
  await transferDocument({
    file,
    intent,
    signal,
    onProgress: (percent) => onProgress({ phase: "uploading", percent }),
  });
  onProgress({ phase: "validating", percent: 100 });
  await finalize(intent, signal);
}
