import type {
  CatalogRow,
  Deliverable,
  DocumentRow,
  DocumentVersion,
  ObligationDetail,
  ObligationSummary,
  RuleRow,
  SlotSpec,
  SubmissionCycle,
  UploadIntent,
} from "@/domain/documents/types/document.types";
import type { DocumentModule } from "@/domain/documents/types/engine.types";

export interface ObligationListProps {
  workerId?: string;
  employmentPeriodId?: string;
  employmentStage?: string;
  companyId?: string;
  module?: string;
  compact?: boolean;
}
export interface ObligationFiltersProps {
  period: string;
  state: string;
  onPeriod: (value: string) => void;
  onState: (value: string) => void;
}
export interface ObligationDetailProps {
  obligationId: string;
}
export interface ObligationWorkspaceProps extends ObligationDetailProps {
  detail: ObligationDetail;
  canReview: boolean;
}
export interface ObligationRouteProps {
  params: Promise<{ obligationId: string }>;
}
export interface ObligationCardProps {
  obligation: ObligationSummary;
  origin?: string;
}
export interface ObligationRowsProps {
  rows: ObligationSummary[];
  origin: string;
}
export interface DeliverableCardProps {
  deliverable: Deliverable;
  detail: ObligationDetail;
  section?: string;
}
export interface UploadControlProps {
  deliverable: Deliverable;
  cycle: SubmissionCycle;
  specs: SlotSpec;
  recovery?: UploadIntent;
}
export interface ReviewControlsProps {
  deliverable: Deliverable;
  summary: ObligationSummary;
}
export interface DispositionProps {
  summary: ObligationSummary;
}
export interface HistoryProps {
  obligationId: string;
  summary: ObligationSummary;
}
export interface VersionRowProps {
  version: DocumentVersion;
  summary: ObligationSummary;
}
export interface DownloadProps {
  versionId: string;
  extension?: string;
  name?: string;
  preview?: boolean;
  inlinePreview?: boolean;
}
export interface CatalogFormProps {
  item?: CatalogRow;
  onSaved: () => void;
  onCancel: () => void;
}
export interface CatalogItemProps {
  item: CatalogRow;
  onEdit: () => void;
}
export interface RuleItemProps {
  rule: RuleRow;
  onEdit: () => void;
}
export interface DocumentLifecycleProps {
  entity: "document_types" | "requirement_rules";
  id: string;
  revision: number;
  deleted: boolean;
}
export interface RuleFormProps {
  onSaved: () => void;
  rule?: RuleRow;
}
export interface RuleDestinationProps {
  catalog: CatalogRow[];
  rule?: RuleRow;
  companyId: string;
  onCompany: (value: string) => void;
  onModule: (value: DocumentModule) => void;
}
export interface FileFieldsProps {
  maximum: number;
}
export interface DocumentItemProps {
  document: DocumentRow;
  origin?: string;
  allowActions?: boolean;
}
export interface FormatFieldsProps {
  name: string;
  selected?: readonly string[];
  disabled?: boolean;
}
export interface SlotFieldsProps {
  position: number;
  maximum: number;
  spec?: SlotSpec;
}
