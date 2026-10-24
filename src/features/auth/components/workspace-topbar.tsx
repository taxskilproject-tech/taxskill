"use client";

import Link from "next/link";

import { Button } from "@/components/atoms/button";
import { Select } from "@/components/atoms/select";
import type { ShellProps } from "@/features/auth/types/auth.types";
import { NotificationBell } from "@/features/notifications/components/notification-bell";

export function WorkspaceTopbar({
  context,
  company,
  onSelectCompany,
  onLogout,
  loggingOut,
}: Omit<ShellProps, "children">) {
  const selected =
    company.kind === "company" ? company.companyId : company.kind;
  const internal =
    context.member.member_type === "internal" &&
    context.capabilities.some(
      (item) => item.company_id === null && item.action === "view",
    );
  const options = (
    <>
      <option value="all">Todas mis empresas</option>
      {internal && <option value="internal">Internas del estudio</option>}
      {context.companies.map((item) => (
        <option key={item.id} value={item.id}>
          {item.legal_name}
        </option>
      ))}
    </>
  );
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white px-4 lg:px-6">
      <div className="flex min-h-14 items-center justify-between gap-3">
        <Link
          className="font-semibold tracking-tight lg:hidden"
          href="/dashboard"
        >
          TaxSkills.
        </Link>
        <div className="hidden w-72 lg:block">
          <label className="sr-only" htmlFor="company-context">
            Contexto de empresa
          </label>
          <Select
            id="company-context"
            value={selected}
            onChange={(event) => onSelectCompany(event.target.value)}
          >
            {options}
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <details className="relative">
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-medium">
              <span className="max-w-24 truncate sm:max-w-40">
                {context.profile.full_name}
              </span>
              <span aria-hidden="true">⌄</span>
            </summary>
            <div className="absolute right-0 z-30 w-64 space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg">
              <p className="text-sm font-medium">{context.profile.full_name}</p>
              <p className="text-xs text-zinc-500">
                {context.member.is_admin
                  ? "Administrador"
                  : context.member.member_type === "client"
                    ? "Cliente"
                    : "Equipo del estudio"}
              </p>
              <Button
                loading={loggingOut}
                loadingText="Cerrando sesión…"
                onClick={onLogout}
                variant="secondary"
              >
                Salir
              </Button>
            </div>
          </details>
        </div>
      </div>
      <div className="pb-2 lg:hidden">
        <label className="sr-only" htmlFor="company-context-mobile">
          Contexto de empresa
        </label>
        <Select
          id="company-context-mobile"
          value={selected}
          onChange={(event) => onSelectCompany(event.target.value)}
        >
          {options}
        </Select>
      </div>
    </header>
  );
}
