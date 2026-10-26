import type { ReactNode } from "react";

import type { DocumentaryModuleId } from "@/domain/common/types/module.types";
import type {
  DocumentPeriodFile,
  DocumentPeriodGroup,
  DocumentPeriodObligation,
  DocumentPeriodWorkspaceData,
} from "@/domain/documents/types/document-workspace.types";

export type DocumentPeriodNavigationKey =
  | "documentYear"
  | "documentMonth"
  | "documentType"
  | "documentState"
  | "documentPage"
  | "documentScope"
  | "documentStage";
export interface DocumentPeriodSelection {
  year: number;
  month: number | null;
  code: string;
  state: string;
  page: number;
  invalid: boolean;
  scope: string;
  stage: string;
}
export interface DocumentPeriodNavigation extends DocumentPeriodSelection {
  select: (key: DocumentPeriodNavigationKey, value: string) => void;
}
export interface DocumentPeriodWorkspaceProps {
  companyId: string;
  module: DocumentaryModuleId;
  workerId?: string;
  employmentPeriodId?: string;
  employmentStage?: string;
}
export interface DocumentPeriodControlsProps {
  navigation: DocumentPeriodNavigation;
  years: number[];
}
export interface DocumentMonthPickerProps {
  months: DocumentPeriodWorkspaceData["months"];
  year: number;
  onMonth: (value: string) => void;
}
export interface DocumentWorkspaceMode {
  scope: "calendar" | "periodic" | "event" | "checklist";
  stage?: string;
  calendar: boolean;
  showStages: boolean;
  showEvents: boolean;
}
export interface DocumentWorkspaceControlsProps extends DocumentPeriodControlsProps {
  mode: DocumentWorkspaceMode;
}
export interface DocumentTypeNavigationProps {
  groups: DocumentPeriodGroup[];
  selected: string;
  onSelect: (code: string) => void;
  periodSummary?: ReactNode;
}
export interface DocumentPeriodResultsProps {
  data: DocumentPeriodWorkspaceData;
  navigation: DocumentPeriodNavigation;
  companyId: string;
  isAdmin: boolean;
  calendar: boolean;
}
export interface DocumentResultsHeadingProps {
  group: DocumentPeriodGroup | undefined;
  navigation: DocumentPeriodNavigation;
}
export interface DocumentPeriodObligationProps {
  obligation: DocumentPeriodObligation;
  origin: string;
}
export interface DocumentFileRowProps extends DocumentPeriodObligationProps {
  file: DocumentPeriodFile;
  compact: boolean;
}
