import type { UseQueryResult } from "@tanstack/react-query";

import type {
  CompanyIndicator,
  DeliveryDetail,
  DeliveryDetails,
  DeliveryIndicator,
} from "@/domain/reporting/types/followup.types";
import type { ReportFilters } from "@/domain/reporting/types/reporting.types";

import type { ReportFilterProps } from "./reporting-ui.types";

export interface CompanyFollowupProps {
  companyId?: string;
}
export interface CompanyIndicatorRowProps {
  row: CompanyIndicator;
  onSelect: (indicator: DeliveryIndicator) => void;
}
export interface DeliveryIndicatorAction {
  id: DeliveryIndicator;
  label: string;
  value: string | number;
}
export interface DeliveryPanelProps {
  module?: string;
  companyId: string;
  indicator: DeliveryIndicator;
  month: string;
  onClose: () => void;
}
export interface DeliveryRowsProps {
  rows: DeliveryDetail[];
  origin: string;
}
export interface DocumentFollowupControlsProps {
  filters: ReportFilters;
  onChange: ReportFilterProps["onChange"];
  onView: (view: "uploaded" | "pending") => void;
  onInvalidAssistant: () => void;
}
export interface PendingDocumentResultsProps {
  query: UseQueryResult<DeliveryDetails>;
}
