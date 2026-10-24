"use client";

import { useQuery } from "@tanstack/react-query";

import { SectionNavigation } from "@/components/molecules/section-navigation";
import { QueryState } from "@/features/access/components/query-state";
import { usePresentation } from "@/features/access/hooks/use-presentation";
import { loadMemberAccess } from "@/features/access/repositories/access.repository";
import type { UserDetailProps } from "@/features/access/types/access-ui.types";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { WhatsappContactForm } from "@/features/notifications/components/whatsapp-contact-form";
import { AccountControls } from "@/features/users/components/account-controls";
import { GrantList } from "@/features/users/components/grant-list";
import { MembershipForm } from "@/features/users/components/membership-form";
import { useDataScope } from "@/lib/query/hooks/use-data-scope";
import { createScopedQueryKey } from "@/lib/query/utils/query-keys";

export function UserDetail({ user, directory, onChanged }: UserDetailProps) {
  const [view, setView] = usePresentation("view", "cuenta", [
    "cuenta",
    "accesos",
    "contacto",
  ]);
  const { context } = useWorkspace();
  const scope = useDataScope();
  const access = useQuery({
    queryKey: createScopedQueryKey(scope!, "member-access", {
      memberId: user.member.id,
    }),
    queryFn: ({ signal }) =>
      loadMemberAccess(context.organization.id, user.member.id, signal),
  });
  function changed() {
    onChanged();
    void access.refetch();
  }
  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm break-all text-zinc-500">{user.profile.email}</p>
      </div>
      <SectionNavigation
        label="Gestión del usuario"
        selected={view}
        onSelect={setView}
        items={[
          { id: "cuenta", label: "Cuenta" },
          { id: "accesos", label: "Accesos" },
          { id: "contacto", label: "Contacto" },
        ]}
      />
      <div hidden={view !== "cuenta"} className="space-y-4">
        {!user.profile.deleted_at && !user.member.deleted_at && (
          <AccountControls
            directory={directory}
            key={user.profile.revision}
            onChanged={changed}
            user={user}
          />
        )}
        <MembershipForm
          directory={directory}
          key={user.member.revision}
          onChanged={changed}
          user={user}
        />
      </div>
      <div hidden={view !== "contacto"}>
        {!user.profile.deleted_at && (
          <WhatsappContactForm
            directory={directory}
            key={`whatsapp:${user.profile.revision}`}
            onChanged={changed}
            user={user}
          />
        )}
      </div>
      <div hidden={view !== "accesos"}>
        <QueryState
          error={access.error}
          loading={access.isPending}
          onRetry={() => {
            void access.refetch();
          }}
          retrying={access.isFetching}
        >
          <GrantList
            directory={directory}
            grants={access.data?.grants ?? []}
            onChanged={changed}
            overrides={access.data?.overrides ?? []}
            user={user}
          />
        </QueryState>
      </div>
    </section>
  );
}
