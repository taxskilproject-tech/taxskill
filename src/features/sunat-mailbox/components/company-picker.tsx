"use client";
import Link from "next/link";
import { useState } from "react";

import { Input } from "@/components/atoms/input";
import { ResourceState } from "@/components/organisms/resource-state";
import { canReadSunat } from "@/domain/sunat/utils/access";
import { PageHeading } from "@/features/access/components/page-heading";
import { Pagination } from "@/features/access/components/pagination";
import { useWorkspace } from "@/features/auth/providers/workspace-context";

export function SunatCompanyPicker() {
  const { context } = useWorkspace();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const eligible = context.companies.filter(
    (company) =>
      company.status === "active" &&
      canReadSunat(context, company.id) &&
      (company.legal_name + company.ruc)
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  const current = Math.min(page, Math.max(1, Math.ceil(eligible.length / 25)));
  return (
    <section className="space-y-3">
      <PageHeading
        title="Buzón SUNAT"
        description="Selecciona la empresa cuyo buzón quieres consultar."
      />
      <label className="sr-only" htmlFor="sunat-company-search">
        Buscar empresa por nombre o RUC
      </label>
      <Input
        id="sunat-company-search"
        placeholder="Buscar empresa por nombre o RUC"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
      />
      <Pagination count={eligible.length} page={current} onPage={setPage} />
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {eligible.slice((current - 1) * 25, current * 25).map((company) => (
          <Link
            key={company.id}
            href={"/buzon-sunat?companyId=" + company.id}
            className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <span>
              <span className="block font-medium">{company.legal_name}</span>
              <span className="text-xs text-slate-600">RUC {company.ruc}</span>
            </span>
            <span aria-hidden="true">›</span>
          </Link>
        ))}
      </div>
      {eligible.length === 0 && (
        <ResourceState
          kind="empty"
          title="No hay empresas disponibles"
          description="El administrador debe asignarte una empresa y habilitar su permiso de Buzón SUNAT."
        />
      )}
    </section>
  );
}
