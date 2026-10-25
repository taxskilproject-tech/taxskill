"use client";

import { usePresentation } from "@/features/access/hooks/use-presentation";
import { presentationPage } from "@/features/access/utils/presentation-page";
import type {
  ConfigurationFilterValues,
  ConfigurationResource,
} from "@/features/documents/types/configuration-filters.types";

export function useConfigurationFilters(
  resource: ConfigurationResource,
): ConfigurationFilterValues {
  const [query, setQuery] = usePresentation(`${resource}Query`, "");
  const [module, setModule] = usePresentation(`${resource}Module`, "", [
    "tributario",
    "laboral_trabajador",
    "laboral_general",
    "actividades",
  ]);
  const [active, setActive] = usePresentation(`${resource}Active`, "", [
    "true",
    "false",
  ]);
  const [company, setCompany] = usePresentation(`${resource}Company`, "");
  const [deleted, setDeleted] = usePresentation(`${resource}Deleted`, "false", [
    "true",
    "false",
  ]);
  const [pageValue, selectPage] = usePresentation(`${resource}Page`, "1");
  const page = presentationPage(pageValue);
  return {
    query,
    module,
    active,
    company,
    deleted: deleted === "true",
    page,
    setQuery,
    setModule,
    setActive,
    setCompany,
    setDeleted,
    setPage: (value) => selectPage(String(value)),
    input: {
      page,
      q: query,
      module: module || undefined,
      active: active ? active === "true" : undefined,
      company_id: resource === "rules" ? company || undefined : undefined,
      include_deleted: deleted === "true",
    },
  };
}
