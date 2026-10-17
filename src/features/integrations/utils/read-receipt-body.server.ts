import "server-only";

import { RECEIPT_MAX_BYTES } from "@/domain/integrations/constants/whatsapp";

async function readBoundedText(
  reader: ReadableStreamDefaultReader<Uint8Array>,
) {
  let size = 0;
  let text = "";
  const decoder = new TextDecoder();
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > RECEIPT_MAX_BYTES) {
      await reader.cancel();
      throw new Error("FILE_TOO_LARGE");
    }
    text += decoder.decode(chunk.value, { stream: true });
  }
  return text + decoder.decode();
}
export async function readReceiptBody(request: Request) {
  if (!request.body) throw new Error("VALIDATION_ERROR");
  const reader = request.body.getReader();
  try {
    return JSON.parse(await readBoundedText(reader));
  } finally {
    reader.releaseLock();
  }
}
