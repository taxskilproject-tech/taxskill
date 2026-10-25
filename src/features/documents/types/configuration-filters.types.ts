import type { DocumentQueryInput } from "@/domain/documents/types/document.types";

export type ConfigurationResource = "catalog" | "rules";
export interface ConfigurationFilterValues {
  input: DocumentQueryInput;
  query: string;
  module: string;
  active: string;
  company: string;
  deleted: boolean;
  page: number;
  setQuery: (value: string) => void;
  setModule: (value: string) => void;
  setActive: (value: string) => void;
  setCompany: (value: string) => void;
  setDeleted: (value: string) => void;
  setPage: (page: number) => void;
}
export interface ConfigurationFiltersProps {
  filters: ConfigurationFilterValues;
  resource: ConfigurationResource;
  busy: boolean;
}

export interface CatalogSearchProps {
  busy: boolean;
  onSearch: (query: string) => void;
}
