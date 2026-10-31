import "server-only";
import { APIError } from "@vercel/sandbox";

export function sunatDispatchFailureCode(error: unknown) {
  if (error instanceof APIError && [402, 429].includes(error.response.status))
    return "SANDBOX_QUOTA_EXCEEDED";
  return "SANDBOX_EXECUTION_FAILED";
}
