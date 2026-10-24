"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/atoms/button";
import { ResourceState } from "@/components/organisms/resource-state";
import { useAction } from "@/features/access/hooks/use-action";
import { AppShell } from "@/features/auth/components/app-shell";
import { OrganizationUnavailable } from "@/features/auth/components/organization-unavailable";
import { useCompanyContext } from "@/features/auth/hooks/use-company-context";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { WorkspaceContext } from "@/features/auth/providers/workspace-context";
import type { ProtectedWorkspaceProps } from "@/features/auth/types/auth.types";
import { authorizationIdentity } from "@/features/auth/utils/authorization-identity";
import { QueryProvider } from "@/lib/query/providers/query-provider";

export function ProtectedWorkspace({ children }: ProtectedWorkspaceProps) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const logout = useAction<null>();
  const { company, module, selectCompany } = useCompanyContext(auth.context);
  useEffect(() => {
    if (auth.status === "anonymous")
      router.replace(
        "/login?returnTo=" +
          encodeURIComponent(pathname + window.location.search),
      );
  }, [auth.status, pathname, router]);

  if (auth.status === "loading" || auth.status === "anonymous")
    return (
      <ResourceState
        description="Verificando acceso al estudio."
        kind="loading"
        title="Preparando tu espacio…"
      />
    );
  if (auth.status === "blocked" || !auth.context)
    return (
      <ResourceState
        action={
          <Button
            loading={logout.busy}
            loadingText="Cerrando sesión…"
            onClick={() => {
              void logout.run(auth.logout);
            }}
          >
            Volver al acceso
          </Button>
        }
        description={
          auth.error?.message ??
          "Consulta al administrador para revisar tu cuenta y membresía."
        }
        kind="forbidden"
        title="No se pudo habilitar el acceso"
      />
    );
  const context = auth.context;
  const scope = {
    userId: context.profile.user_id,
    organizationId: context.organization.id,
    company,
    module: "all",
    authorization: authorizationIdentity(context),
  } as const;
  return (
    <QueryProvider scope={scope}>
      <WorkspaceContext value={{ context, company, selectCompany }}>
        <AppShell
          company={company}
          documentaryModule={module}
          context={context}
          error={logout.error ?? undefined}
          loggingOut={logout.busy}
          onLogout={() => {
            void logout.run(auth.logout);
          }}
          onSelectCompany={selectCompany}
        >
          {context.organization.deleted_at ||
          context.organization.status !== "active" ? (
            <OrganizationUnavailable />
          ) : (
            children
          )}
        </AppShell>
      </WorkspaceContext>
    </QueryProvider>
  );
}
