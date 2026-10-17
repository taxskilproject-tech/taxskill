import type { WebhookOutcome } from "@/domain/integrations/types/whatsapp.types";

export function canRetryWebhook(result: WebhookOutcome) {
  if (result.accepted) return false;
  return (
    result.httpStatus === null ||
    result.httpStatus === 429 ||
    result.httpStatus >= 500
  );
}
