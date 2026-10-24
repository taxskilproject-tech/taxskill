import type {
  Employment,
  Worker,
  WorkerDetail,
  WorkerList,
} from "@/domain/workers/types/worker.types";

export interface WorkersPanelProps {
  companyId: string;
}
export interface WorkerRouteProps {
  params: Promise<{ companyId: string; workerId: string }>;
}
export interface WorkerDetailPageProps {
  companyId: string;
  workerId: string;
}
export interface WorkerFormProps {
  companyId: string;
  worker?: Worker;
  onSaved: () => void;
  onCancel: () => void;
}
export interface WorkerFieldsProps {
  worker?: Worker;
}
export interface EmploymentFieldsProps {
  stage?: Employment;
  historical?: boolean;
}
export interface EndFieldsProps {
  stage?: Employment;
}
export interface WorkerCardProps {
  worker: WorkerList["rows"][number];
  origin?: string;
}
export interface WorkerFactsProps {
  worker: Worker;
}
export interface EmploymentFactsProps {
  stage: Employment;
}
export interface EmploymentFormProps {
  detail: WorkerDetail;
  mode: "start" | "correct";
  onSaved: () => void;
}
export type EndEmploymentFormProps = Omit<EmploymentFormProps, "mode">;
export interface EmploymentActionsProps {
  detail: WorkerDetail;
  canManage: boolean;
}
export type WorkerWorkspaceProps = EmploymentActionsProps & StageSelectorProps;
export interface StageSelectorProps {
  detail: WorkerDetail;
  page: number;
  onPage: (page: number) => void;
}
export interface StageDocumentsProps {
  detail: WorkerDetail;
}
export interface GenerationProgressProps {
  detail: WorkerDetail;
  canManage: boolean;
}
export interface WorkerLifecycleProps {
  worker: Worker;
}
export interface WorkerFiltersProps {
  search: string;
  onSearch: (value: string) => void;
  status: string;
  onStatus: (value: string) => void;
  deleted: boolean;
  onDeleted: (value: boolean) => void;
  isAdmin: boolean;
}
