import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useDataScope } from "@/lib/query/hooks/use-data-scope";
import { createScopedQueryKey } from "@/lib/query/utils/query-keys";

import type { QueryProbeProps } from "../types/query-probe.types";

export function QueryProbe({ onClient, queryFn }: QueryProbeProps) {
  const scope = useDataScope();
  const client = useQueryClient();
  const result = useQuery({
    enabled: Boolean(scope),
    queryFn,
    queryKey: scope ? createScopedQueryKey(scope, "documents") : ["anonymous"],
  });

  useEffect(() => onClient(client), [client, onClient]);

  return (
    <p>
      {scope?.userId}: {result.data ?? "Sin datos"}
    </p>
  );
}
