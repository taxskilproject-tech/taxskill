import { createHmac, timingSafeEqual } from "node:crypto";

import { SUNAT_DISPATCH_SIGNATURE_TTL_SECONDS } from "@/features/sunat-mailbox/constants/dispatch";
import type { SunatDispatchEnvelope } from "@/features/sunat-mailbox/types/dispatch.types";

export function hasSunatDispatchAuthorization(
  signature: string | null,
  envelope: SunatDispatchEnvelope,
  secret: string | undefined,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!secret || !/^[a-f0-9]{64}$/.test(secret)) return false;
  if (!signature || !/^[a-f0-9]{64}$/.test(signature)) return false;
  if (
    Math.abs(nowSeconds - envelope.issued_at) >
    SUNAT_DISPATCH_SIGNATURE_TTL_SECONDS
  )
    return false;
  const canonical = `v1:${envelope.nonce}:${envelope.issued_at}:${envelope.action}`;
  const expected = createHmac("sha256", secret).update(canonical).digest();
  return timingSafeEqual(Buffer.from(signature, "hex"), expected);
}
