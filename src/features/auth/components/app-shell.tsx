"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { MobileWorkspaceNavigation } from "@/features/auth/components/mobile-workspace-navigation";
import { WorkspaceSidebar } from "@/features/auth/components/workspace-sidebar";
import { WorkspaceTopbar } from "@/features/auth/components/workspace-topbar";
import { useScrollRestoration } from "@/features/auth/hooks/use-scroll-restoration";
import type { ShellProps } from "@/features/auth/types/auth.types";
import { workspaceNavigation } from "@/features/auth/utils/workspace-navigation";
import { activeNavigation } from "@/features/auth/utils/workspace-route";

export function AppShell(props: ShellProps) {
  const pathname = usePathname();
  const parameters = useSearchParams();
  const navigation = workspaceNavigation(props.context, props.company);
  const active = activeNavigation(
    pathname,
    new URLSearchParams(parameters.toString()),
  );
  const companyId =
    props.company.kind === "company" ? props.company.companyId : null;
  const companyName = companyId
    ? (props.context.companies.find((item) => item.id === companyId)
        ?.legal_name ?? "Empresa seleccionada")
    : "Selecciona una empresa para abrir un módulo";
  useScrollRestoration(
    `${props.context.profile.user_id}:${props.context.organization.id}:${JSON.stringify(props.company)}`,
  );
  return (
    <div className="min-h-dvh bg-slate-50 pb-20 lg:pb-0 lg:pl-60">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-white focus:p-3"
        href="#main"
      >
        Ir al contenido
      </a>
      <WorkspaceSidebar
        items={navigation}
        active={active}
        companyName={props.context.organization.name}
      />
      <WorkspaceTopbar {...props} />
      <main
        className="mx-auto max-w-[1600px] scroll-mt-28 space-y-4 px-4 py-4 lg:scroll-mt-16 lg:px-6 lg:py-5"
        id="main"
        tabIndex={-1}
      >
        {props.error && (
          <FeedbackMessage kind="error">{props.error}</FeedbackMessage>
        )}
        {props.children}
      </main>
      <MobileWorkspaceNavigation
        items={navigation}
        active={active}
        companyName={companyName}
      />
    </div>
  );
}
