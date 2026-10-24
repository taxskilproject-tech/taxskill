"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { SidePanel } from "@/components/organisms/side-panel";
import { WorkspaceTopbar } from "@/features/auth/components/workspace-topbar";
import { useScrollRestoration } from "@/features/auth/hooks/use-scroll-restoration";
import type { ShellProps } from "@/features/auth/types/auth.types";
import { workspaceNavigation } from "@/features/auth/utils/workspace-navigation";

export function AppShell(props: ShellProps) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const navigation = workspaceNavigation(props.context);
  const linkClass = (href: string) =>
    `flex min-h-11 items-center rounded-lg px-3 text-sm focus-visible:outline-2 ${pathname.startsWith(href) ? "bg-zinc-950 font-medium text-white" : "text-zinc-600 hover:bg-zinc-100"}`;
  useScrollRestoration(
    props.context.profile.user_id +
      ":" +
      props.context.organization.id +
      ":" +
      JSON.stringify(props.company),
  );
  return (
    <div className="min-h-dvh pb-20 lg:pb-0 lg:pl-56">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-white focus:p-3"
        href="#main"
      >
        Ir al contenido
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col overflow-y-auto border-r border-zinc-200 bg-white p-3 lg:flex">
        <Link
          className="px-3 py-4 text-xl font-semibold tracking-tight"
          href="/dashboard"
        >
          TaxSkills.
        </Link>
        <p className="truncate px-3 text-xs text-zinc-500">
          {props.context.organization.name}
        </p>
        <nav aria-label="Navegación principal" className="mt-5 space-y-5">
          {["Trabajo", "Supervisión", "Administración"].map((group) => (
            <div key={group} className="space-y-1">
              {navigation.some((item) => item.group === group) && (
                <p className="px-3 text-xs font-medium text-zinc-500">
                  {group}
                </p>
              )}
              {navigation
                .filter((item) => item.group === group)
                .map((item) => (
                  <Link
                    aria-current={
                      pathname.startsWith(item.href) ? "page" : undefined
                    }
                    className={linkClass(item.href)}
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                ))}
            </div>
          ))}
        </nav>
        <p className="mt-auto px-3 pt-6 text-xs text-zinc-500">
          Perú · America/Lima
        </p>
      </aside>
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
      <nav
        aria-label="Navegación móvil"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-zinc-200 bg-white px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        {navigation.slice(0, 3).map((item) => (
          <Link
            aria-current={pathname.startsWith(item.href) ? "page" : undefined}
            className={linkClass(item.href) + " justify-center px-1"}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
        <button
          aria-expanded={more}
          className="min-h-11 rounded-lg text-sm font-medium focus-visible:outline-2"
          onClick={() => setMore(true)}
        >
          Más
        </button>
      </nav>
      {more && (
        <SidePanel title="Más opciones" onClose={() => setMore(false)}>
          <nav aria-label="Más secciones" className="space-y-2">
            {navigation.slice(3).map((item) => (
              <Link
                className={linkClass(item.href)}
                href={item.href}
                key={item.href}
                onClick={() => setMore(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </SidePanel>
      )}
    </div>
  );
}
