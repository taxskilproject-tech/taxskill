"use client";

import Link from "next/link";

import { Badge } from "@/components/atoms/badge";
import { ResourceState } from "@/components/organisms/resource-state";
import { PageHeading } from "@/features/access/components/page-heading";
import { useWorkspace } from "@/features/auth/providers/workspace-context";

export function DashboardPage() {
  const { context, company } = useWorkspace();
  const companies = context.companies.filter(
    (item) =>
      company.kind === "all" ||
      (company.kind === "company" && item.id === company.companyId),
  );
  return (
    <div className="space-y-8">
      <PageHeading
        description="Accede a las empresas disponibles para tu cuenta y administra el espacio de tu equipo."
        eyebrow="TaxSkills · Inicio"
        title={`Hola, ${context.profile.full_name.split(" ")[0]}`}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <p className="text-sm text-zinc-500">Empresas en tu contexto</p>
          <p className="mt-3 text-4xl font-semibold tracking-tight">
            {companies.length}
          </p>
          <Link
            className="mt-5 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4"
            href="/empresas"
          >
            Consultar empresas →
          </Link>
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <p className="text-sm text-zinc-500">Tu acceso</p>
          <h2 className="mt-3 text-xl font-semibold">
            {context.member.is_admin
              ? "Administración del estudio"
              : "Espacio asignado"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            {context.member.is_admin
              ? "Gestiona cuentas, roles y responsables desde la navegación."
              : "Solo verás las empresas y módulos habilitados para tu cuenta."}
          </p>
          <Badge>
            {context.member.member_type === "internal"
              ? "Equipo interno"
              : "Cliente"}
          </Badge>
        </section>
      </div>
      {!companies.length && (
        <ResourceState
          description="Solicita al administrador una asignación de empresa y módulo. Las actividades internas aparecerán en su hito correspondiente."
          kind="empty"
          title="Aún no tienes empresas en este contexto"
        />
      )}
      <p className="text-xs leading-6 text-zinc-500">
        Los indicadores de cumplimiento se incorporarán con el módulo de
        reportes.
      </p>
    </div>
  );
}
