"use client";

import { useRef } from "react";

import type {
  AdminOperation,
  CommandResult,
} from "@/domain/access/types/access.types";
import { useAction } from "@/features/access/hooks/use-action";
import { callAdmin } from "@/features/access/repositories/access.repository";
import { useWorkspace } from "@/features/auth/providers/workspace-context";

export function useAdminCommand() {
  const action = useAction<CommandResult>();
  const { context } = useWorkspace();
  const requestId = useRef("");
  function resetIntent() {
    requestId.current = "";
    action.clear();
  }
  async function submit(
    operation: AdminOperation,
    input: Record<string, unknown>,
    userId?: string,
  ) {
    requestId.current ||= crypto.randomUUID();
    const endpoint =
      "/api/admin/users" +
      (userId
        ? `/${userId}/${operation === "SetUserPassword" ? "password" : "enabled"}`
        : "");
    const succeeded = await action.run(() =>
      callAdmin(endpoint, operation === "SetUserEnabled" ? "PATCH" : "POST", {
        organization_id: context.organization.id,
        request_id: requestId.current,
        input,
      }),
    );
    if (succeeded) requestId.current = "";
    return succeeded;
  }
  return { ...action, submit, resetIntent };
}
