"use client";
import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";

import type { DocumentQueryInput } from "@/domain/documents/types/document.types";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { queryDocuments } from "@/features/documents/repositories/document.repository";
import { useDataScope } from "@/lib/query/hooks/use-data-scope";
import { createScopedQueryKey } from "@/lib/query/utils/query-keys";

export function useDocumentQuery<T>(
  resource: string,
  input: DocumentQueryInput,
  schema: z.ZodType<T>,
  enabled = true,
) {
  const { context } = useWorkspace();
  const scope = useDataScope();
  return useQuery({
    queryKey: createScopedQueryKey(scope!, `documents:${resource}`, {
      ...input,
    }),
    queryFn: ({ signal }) =>
      queryDocuments(context.organization.id, resource, input, schema, signal),
    enabled,
  });
}
