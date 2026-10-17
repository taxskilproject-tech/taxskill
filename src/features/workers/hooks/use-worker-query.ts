"use client";
import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";

import type { WorkerQueryInput } from "@/domain/workers/types/worker.types";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { queryWorkers } from "@/features/workers/repositories/worker.repository";
import { useDataScope } from "@/lib/query/hooks/use-data-scope";
import { createScopedQueryKey } from "@/lib/query/utils/query-keys";

export function useWorkerQuery<T>(
  resource: string,
  input: WorkerQueryInput,
  schema: z.ZodType<T>,
  enabled = true,
) {
  const { context } = useWorkspace();
  const scope = useDataScope();
  return useQuery({
    queryKey: createScopedQueryKey(scope!, `workers:${resource}`, { ...input }),
    queryFn: ({ signal }) =>
      queryWorkers(context.organization.id, resource, input, schema, signal),
    enabled,
  });
}
