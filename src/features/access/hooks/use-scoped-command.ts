"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

import { useAction } from "@/features/access/hooks/use-action";
import type { ScopedCommandExecutor } from "@/features/access/types/scoped-command.types";
import { useWorkspace } from "@/features/auth/providers/workspace-context";

export function useScopedCommand<Operation extends string, Result>(
  execute: ScopedCommandExecutor<Operation, Result>,
) {
  const action = useAction<Result>();
  const { context } = useWorkspace();
  const cache = useQueryClient();
  const intent = useRef({ fingerprint: "", requestId: "" });
  async function submit(operation: Operation, input: Record<string, unknown>) {
    const fingerprint = JSON.stringify({ operation, input });
    if (intent.current.fingerprint !== fingerprint)
      intent.current = { fingerprint, requestId: crypto.randomUUID() };
    const succeeded = await action.run(async () => {
      const result = await execute(
        context.organization.id,
        intent.current.requestId,
        operation,
        input,
      );
      if (result.ok) await cache.invalidateQueries();
      return result;
    });
    if (succeeded) intent.current = { fingerprint: "", requestId: "" };
    return succeeded;
  }
  return { ...action, submit };
}
