export type VisualTone =
  "neutral" | "blue" | "violet" | "cyan" | "success" | "warning" | "danger";

export type IconName =
  | "check"
  | "home"
  | "activity"
  | "tax"
  | "worker"
  | "team"
  | "company"
  | "document"
  | "inbox"
  | "report"
  | "audit"
  | "bell"
  | "users"
  | "settings"
  | "modules"
  | "more"
  | "arrow";

export interface IconProps {
  name: IconName;
  className?: string;
}
