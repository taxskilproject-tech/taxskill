import type { ReactNode } from "react";

export interface SidePanelProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}

export interface SectionNavigationItem {
  id: string;
  label: string;
}

export interface SectionNavigationProps {
  label: string;
  items: readonly SectionNavigationItem[];
  selected: string;
  onSelect: (value: string) => void;
}

export interface FilterDisclosureProps {
  children: ReactNode;
  count?: number;
  label?: string;
}
