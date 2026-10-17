import { createHash, timingSafeEqual } from "node:crypto";
import "server-only";

export function verifyReceiptSecret(
  authorization: string | null,
  expected: string | undefined,
) {
  if (
    !expected ||
    expected.length < 32 ||
    !authorization?.startsWith("Bearer ")
  )
    return false;
  const actualHash = createHash("sha256")
    .update(authorization.slice(7))
    .digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actualHash, expectedHash);
}
