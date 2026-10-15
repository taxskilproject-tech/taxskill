import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: "primary" | "secondary";
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export interface BadgeProps {
  children: ReactNode;
}

export interface FeedbackMessageProps {
  children: ReactNode;
  kind?: "error" | "info" | "success";
  id?: string;
}

export interface FormFieldProps extends Omit<InputProps, "id"> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
}

export interface ResourceStateProps {
  title: string;
  description: string;
  kind: "empty" | "error" | "forbidden" | "not-found" | "loading" | "conflict";
  action?: ReactNode;
}

export interface WorkspaceTemplateProps {
  children: ReactNode;
  status?: ReactNode;
}

export interface SectionPanelProps {
  children: ReactNode;
  description: string;
  headingId: string;
  title: string;
}

export interface RootLayoutProps {
  children: ReactNode;
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;
export interface SelectFieldProps extends SelectProps {
  id: string;
  label: string;
}
export interface CheckboxFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
}
