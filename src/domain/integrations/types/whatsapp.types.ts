import type { z } from "zod";

import type {
  whatsappBatchSchema,
  whatsappReceiptSchema,
} from "@/domain/integrations/contracts/whatsapp.schema";
export type WhatsappBatch = z.infer<typeof whatsappBatchSchema>;
export type WhatsappReceipt = z.infer<typeof whatsappReceiptSchema>;
export interface WebhookOutcome {
  httpStatus: number | null;
  accepted: boolean;
  outcome: "responded" | "timeout" | "connection_error";
}
