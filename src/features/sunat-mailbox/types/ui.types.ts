import type { ReactNode } from "react";

import type {
  SunatAccess,
  SunatAlert,
  SunatAttachment,
  SunatDetail,
  SunatMessageList,
  SunatWorkspace,
} from "@/domain/sunat/types/sunat.types";

export interface SunatFilters {
  year: number;
  month: number;
  mailbox: "all" | "notifications" | "messages";
  q: string;
  page: number;
  messageId: string | null;
}
export interface SunatFilterProps {
  action?: ReactNode;
  filters: SunatFilters;
  onChange: (values: Record<string, string>) => void;
}
export interface SunatCompanyProps {
  companyId: string;
}
export interface SunatWorkspaceProps {
  workspace: SunatWorkspace;
  onChanged: () => void;
}
export interface SunatConnectionPanelProps extends SunatWorkspaceProps {
  onClose: () => void;
}
export interface SunatListProps {
  data: SunatMessageList;
  onOpen: (id: string) => void;
}
export interface SunatDetailPanelProps {
  companyId: string;
  messageId: string;
  onClose: () => void;
  onChanged: () => void;
}
export interface SunatDetailContentProps {
  companyId: string;
  detail: SunatDetail;
  onChanged: () => void;
}
export interface SunatAttachmentProps {
  companyId: string;
  attachment: SunatAttachment;
  onChanged: () => void;
}
export interface SunatMemberAccessProps {
  memberId: string;
  onChanged: () => void;
}
export interface SunatAccessRowProps {
  row: SunatAccess["rows"][number];
  memberId: string;
  onChanged: () => void;
}
export interface SunatAlertRowProps {
  alert: SunatAlert;
  onChanged: () => void;
}
export interface SunatInboxProps {
  companyId: string;
  filters: SunatFilters;
  workspace: SunatWorkspace;
  onChange: (values: Record<string, string>) => void;
}
