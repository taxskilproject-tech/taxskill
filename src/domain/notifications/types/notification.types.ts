import type { z } from "zod";

import type {
  digestSchema,
  notificationSchema,
} from "@/domain/notifications/contracts/notification.schema";
export type PersonalNotification = z.infer<typeof notificationSchema>;
export type WhatsappDigest = z.infer<typeof digestSchema>;
