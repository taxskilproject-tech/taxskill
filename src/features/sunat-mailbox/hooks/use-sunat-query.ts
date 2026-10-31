"use client";
import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";

import {
  SUNAT_IDLE_POLL_INTERVAL_MS,
  SUNAT_POLL_INTERVAL_MS,
} from "@/domain/sunat/constants/sunat";
import { sunatWorkspaceSchema } from "@/domain/sunat/contracts/sunat.schema";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { querySunat } from "@/features/sunat-mailbox/repositories/sunat.repository";
import { useDataScope } from "@/lib/query/hooks/use-data-scope";
import { createScopedQueryKey } from "@/lib/query/utils/query-keys";

export function useSunatQuery<T>(
  resource: string,
  input: Record<string, string | number | boolean | undefined>,
  schema: z.ZodType<T>,
  enabled = true,
  poll: boolean | number = false,
) {
  const { context } = useWorkspace();
  const scope = useDataScope();
  return useQuery({
    queryKey: createScopedQueryKey(scope!, "sunat:" + resource, input),
    queryFn: ({ signal }) =>
      querySunat(context.organization.id, resource, input, schema, signal),
    enabled,
    refetchInterval: poll
      ? (query) => {
          if (typeof poll === "number") return poll;
          if (resource !== "workspace") return SUNAT_POLL_INTERVAL_MS;
          const parsed = sunatWorkspaceSchema.safeParse(query.state.data);
          return parsed.success &&
            parsed.data.jobs.some(
              (job) => job.state === "queued" || job.state === "running",
            )
            ? SUNAT_POLL_INTERVAL_MS
            : SUNAT_IDLE_POLL_INTERVAL_MS;
        }
      : false,
  });
}
