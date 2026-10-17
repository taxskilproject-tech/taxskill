import type {
  ActivityFilterName,
  ActivityFilters,
  ActivityList,
  AdditionalRule,
} from "@/domain/activities/types/activity.types";
export interface ActivityInboxProps {
  companyId?: string;
}
export interface ActivityFiltersProps {
  filters: ActivityFilters;
  lockedCompany: boolean;
  onChange: (name: ActivityFilterName, value: string) => void;
}
export interface ActivityGroupsProps {
  filters: ActivityFilters;
  counts: ActivityList["groups"];
  onGroup: (group: string) => void;
}
export interface ActivityIndicatorsProps {
  indicators: ActivityList["indicators"];
}
export interface AdditionalFormProps {
  companyId?: string;
  rule?: AdditionalRule;
  onSaved: () => void;
  onCancel: () => void;
}
export interface AdditionalFieldsProps {
  companyId: string;
  fixedCompany?: string;
  maximum: number;
  rule?: AdditionalRule;
  onCompany: (value: string) => void;
  onMaximum: (value: number) => void;
}
export interface AdditionalRuleProps {
  rule: AdditionalRule;
}
