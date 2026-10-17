import type {
  PersonalNotification,
  WhatsappDigest,
} from "@/domain/notifications/types/notification.types";
export interface NotificationItemProps {
  notification: PersonalNotification;
  origin: string;
}
export interface DigestCardProps {
  digest: WhatsappDigest;
}
export interface AttemptHistoryProps {
  digestId: string;
}
