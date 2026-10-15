"use client";

import { ResourceState } from "@/components/organisms/resource-state";
import { LifecycleControl } from "@/features/access/components/lifecycle-control";
import { useWorkspace } from "@/features/auth/providers/workspace-context";

export function OrganizationUnavailable() {
  const { context } = useWorkspace();
  return (
    <ResourceState
      action={
        context.member.is_admin && context.organization.deleted_at ? (
          <LifecycleControl
            deleted
            entity="organizations"
            id={context.organization.id}
            onChanged={() => undefined}
            revision={context.organization.revision}
          />
        ) : undefined
      }
      description="El estudio está fuera de operación. Su información y los estados de sus registros se conservan."
      kind="forbidden"
      title="Estudio no disponible"
    />
  );
}
