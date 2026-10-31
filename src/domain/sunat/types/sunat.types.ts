import type { z } from "zod";

import type {
  saveSunatCredentialsSchema,
  sunatAccessSchema,
  sunatAlertsSchema,
  sunatAttachmentSchema,
  sunatCommandResultSchema,
  sunatConnectionSchema,
  sunatDetailSchema,
  sunatJobSchema,
  sunatMessageListSchema,
  sunatWorkspaceSchema,
} from "../contracts/sunat.schema";

export type SunatConnection = z.infer<typeof sunatConnectionSchema>;
export type SunatJob = z.infer<typeof sunatJobSchema>;
export type SunatWorkspace = z.infer<typeof sunatWorkspaceSchema>;
export type SunatMessageList = z.infer<typeof sunatMessageListSchema>;
export type SunatDetail = z.infer<typeof sunatDetailSchema>;
export type SunatAttachment = z.infer<typeof sunatAttachmentSchema>;
export type SunatCommandResult = z.infer<typeof sunatCommandResultSchema>;
export type SunatAccess = z.infer<typeof sunatAccessSchema>;
export type SunatAlert = z.infer<typeof sunatAlertsSchema>["rows"][number];
export type SaveSunatCredentials = z.infer<typeof saveSunatCredentialsSchema>;
export type SunatOperation =
  | "RequestSync"
  | "ResumeSync"
  | "RequestMessage"
  | "RequestAttachment"
  | "Disconnect"
  | "SetAccess"
  | "UpdateSchedule"
  | "MarkAlertRead"
  | "CancelJob";
