"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/atoms/button";
import { ResourceState } from "@/components/organisms/resource-state";
import { useAction } from "@/features/access/hooks/use-action";
import { AppShell } from "@/features/auth/components/app-shell";
import { OrganizationUnavailable } from "@/features/auth/components/organization-unavailable";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { WorkspaceContext } from "@/features/auth/providers/workspace-context";
import type { ProtectedWorkspaceProps } from "@/features/auth/types/auth.types";
import { authorizationIdentity } from "@/features/auth/utils/authorization-identity";
import { QueryProvider } from "@/lib/query/providers/query-provider";
import type { CompanyScope } from "@/lib/query/types/query.types";

export function ProtectedWorkspace({ children }: ProtectedWorkspaceProps) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const logout = useAction<null>();
  const [selection, setSelection] = useState("all");
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
  const selectedId = context.companies.some((item) => item.id === selection)
    ? selection
    : null;
  const company: CompanyScope = selectedId
    ? { kind: "company", companyId: selectedId }
    : selection === "internal" && context.member.member_type === "internal"
      ? { kind: "internal" }
      : { kind: "all" };
  const scope = {
    userId: context.profile.user_id,
    organizationId: context.organization.id,
    company,
    module: "all",
    authorization: authorizationIdentity(context),
  } as const;
  function selectCompany(value: string) {
    setSelection(value);
    if (pathname.startsWith("/empresas/"))
      router.replace(
        context.companies.some((item) => item.id === value)
          ? "/empresas/" + value
          : "/empresas",
      );
  }
  return (
    <QueryProvider scope={scope}>
      <WorkspaceContext value={{ context, company, selectCompany }}>
        <AppShell
          company={company}
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
