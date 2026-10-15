"use client";

import { useRef } from "react";

import type {
  CommandResult,
  MutationOperation,
} from "@/domain/access/types/access.types";
import { useAction } from "@/features/access/hooks/use-action";
import { executeCommand } from "@/features/access/repositories/access.repository";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useWorkspace } from "@/features/auth/providers/workspace-context";

export function useCommand() {
  const action = useAction<CommandResult>();
  const { context } = useWorkspace();
  const { refresh } = useAuth();
  const intent = useRef({ fingerprint: "", requestId: "" });

  async function submit(
    operation: MutationOperation,
    input: Record<string, unknown>,
  ) {
    const fingerprint = JSON.stringify({ operation, input });
    if (intent.current.fingerprint !== fingerprint)
      intent.current = { fingerprint, requestId: crypto.randomUUID() };
    const succeeded = await action.run(async () => {
      const result = await executeCommand({
        organization_id: context.organization.id,
        request_id: intent.current.requestId,
        operation,
        input,
      });
      if (result.ok) await refresh();
      return result;
    });
    if (succeeded) {
      intent.current = { fingerprint: "", requestId: "" };
    }
    return succeeded;
  }
  return { ...action, submit };
}
