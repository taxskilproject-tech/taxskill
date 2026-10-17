"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { SelectField } from "@/components/molecules/select-field";
import type { ShellProps } from "@/features/auth/types/auth.types";
import { NotificationBell } from "@/features/notifications/components/notification-bell";

export function AppShell({
  children,
  context,
  company,
  onSelectCompany,
  onLogout,
  loggingOut,
  error,
}: ShellProps) {
  const pathname = usePathname();
  const navigation = [
    { href: "/dashboard", label: "Inicio" },
    { href: "/actividades", label: "Actividades" },
    { href: "/empresas", label: "Empresas" },
    { href: "/documentos", label: "Documentos" },
    ...(context.member.is_admin || context.capabilities.some(item => item.action === "reports.view") ? [{ href: "/reportes", label: "Reportes" }] : []),
    ...(context.member.is_admin || context.capabilities.some(item => item.action === "audit.view") ? [{ href: "/auditoria", label: "Auditoría" }] : []),
    { href: "/notificaciones", label: "Notificaciones" },
    ...(context.member.is_admin
      ? [
          { href: "/usuarios", label: "Usuarios" },
          { href: "/configuracion", label: "Configuración" },
        ]
      : []),
  ];
  const currentCompany =
    company.kind === "company" ? company.companyId : company.kind;
  const hasInternal =
    context.member.member_type === "internal" &&
    context.capabilities.some(
      (item) => item.company_id === null && item.action === "view",
    );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-4"
        href="#main"
      >
        Ir al contenido
      </a>
      <aside className="flex flex-col border-b border-zinc-200 bg-white lg:min-h-dvh lg:border-r lg:border-b-0">
        <div className="px-6 pt-7 pb-5">
          <Link
            className="text-xl font-semibold tracking-tight"
            href="/dashboard"
          >
            TaxSkills
            <span className="ml-1 inline-block size-1.5 rounded-full bg-zinc-950" />
          </Link>
          <p className="mt-2 truncate text-xs text-zinc-500">
            {context.organization.name}
          </p>
        </div>
        <nav
          aria-label="Navegación principal"
          className="flex gap-1 overflow-x-auto px-3 pb-4 lg:flex-col"
        >
          {navigation.map((item) => (
            <Link
              aria-current={pathname.startsWith(item.href) ? "page" : undefined}
              className={`flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 ${pathname.startsWith(item.href) ? "bg-zinc-100 font-medium text-zinc-950" : "text-zinc-600 hover:bg-zinc-50"}`}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-zinc-100 p-6 text-xs leading-6 text-zinc-500 lg:block">
          Gestión documental
          <br />
          Perú · America/Lima
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 bg-white px-5 py-4 lg:px-10">
          <div className="w-full max-w-xs">
            <SelectField
              id="company-context"
              label="Contexto de empresa"
              onChange={(event) => onSelectCompany(event.target.value)}
              value={currentCompany}
            >
              <option value="all">Todas mis empresas</option>
              {hasInternal && (
                <option value="internal">Internas del estudio</option>
              )}
              {context.companies.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.legal_name}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:flex-nowrap">
            <NotificationBell />
            <div className="min-w-0 flex-1 text-left sm:text-right">
              <p className="text-sm font-medium">{context.profile.full_name}</p>
              <p className="text-xs text-zinc-500">
                {context.member.is_admin
                  ? "Administrador"
                  : context.member.member_type === "client"
                    ? "Cliente"
                    : "Equipo del estudio"}
              </p>
            </div>
            <Button
              loading={loggingOut}
              loadingText="Cerrando sesión…"
              onClick={onLogout}
              variant="secondary"
            >
              Salir
            </Button>
          </div>
        </header>
        <main
          className="mx-auto max-w-7xl space-y-6 px-5 py-8 lg:px-10 lg:py-10"
          id="main"
        >
          {error && <FeedbackMessage kind="error">{error}</FeedbackMessage>}
          {children}
        </main>
      </div>
    </div>
  );
}
