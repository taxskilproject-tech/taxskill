"use client";
import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";

import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { queryReporting } from "@/features/reporting/repositories/reporting.repository";
import { useDataScope } from "@/lib/query/hooks/use-data-scope";
import type { QueryFilters } from "@/lib/query/types/query.types";
import { createScopedQueryKey } from "@/lib/query/utils/query-keys";

export function useReportQuery<T>(
  resource: string,
  input: QueryFilters,
  schema: z.ZodType<T>,
  enabled = true,
) {
  const { context } = useWorkspace();
  const scope = useDataScope();
  return useQuery({
    queryKey: createScopedQueryKey(scope!, `reporting:${resource}`, input),
    queryFn: ({ signal }) =>
      queryReporting(context.organization.id, resource, input, schema, signal),
    enabled,
  });
}
