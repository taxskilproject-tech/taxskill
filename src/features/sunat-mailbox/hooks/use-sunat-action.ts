"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import type {
  SunatCommandResult,
  SunatOperation,
} from "@/domain/sunat/types/sunat.types";
import { useAction } from "@/features/access/hooks/use-action";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import {
  commandSunat,
  waitForSunatJob,
} from "@/features/sunat-mailbox/repositories/sunat.repository";
import { useDataScope } from "@/lib/query/hooks/use-data-scope";
import { createScopedQueryKey } from "@/lib/query/utils/query-keys";

export function useSunatAction() {
  const { context } = useWorkspace();
  const scope = useDataScope();
  const queries = useQueryClient();
  const action = useAction<SunatCommandResult>();
  const request = useRef({ identity: "", id: "" });
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function submit(
    operation: SunatOperation,
    input: Record<string, unknown>,
    wait = false,
  ) {
    if (controller.current) return false;
    const identity = JSON.stringify([operation, input]);
    if (request.current.identity !== identity)
      request.current = { identity, id: crypto.randomUUID() };
    const signal = new AbortController();
    controller.current = signal;
    try {
      return await action.run(async () => {
        const response = await commandSunat(
          context.organization.id,
          request.current.id,
          operation,
          input,
        );
        if (response.ok) {
          request.current = { identity: "", id: "" };
          void queries.invalidateQueries({
            queryKey: createScopedQueryKey(scope!, "sunat:alert_count").slice(
              0,
              3,
            ),
          });
        }
        if (!response.ok || !wait) return response;
        return waitForSunatJob(response.data, signal.signal);
      });
    } finally {
      controller.current = null;
    }
  }
  return { ...action, submit };
}
