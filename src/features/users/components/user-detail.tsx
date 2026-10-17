"use client";

import { useQuery } from "@tanstack/react-query";

import { QueryState } from "@/features/access/components/query-state";
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
    <section className="space-y-6 border-t border-zinc-200 pt-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {user.profile.full_name}
        </h2>
        <p className="mt-2 text-sm text-zinc-500">{user.profile.email}</p>
      </div>
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
      {!user.profile.deleted_at && (
        <WhatsappContactForm
          directory={directory}
          key={`whatsapp:${user.profile.revision}`}
          onChanged={changed}
          user={user}
        />
      )}
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
    </section>
  );
}
