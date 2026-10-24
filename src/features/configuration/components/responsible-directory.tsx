"use client";
import Link from "next/link";
import { useState } from "react";

import { SelectField } from "@/components/molecules/select-field";
import { useWorkspace } from "@/features/auth/providers/workspace-context";

export function ResponsibleDirectory() {
  const { context, company } = useWorkspace();
  const [selection, setSelection] = useState("");
  const selected = company.kind === "company" ? company.companyId : selection;
  const found = context.companies.find((item) => item.id === selected);
  return (
    <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
      <h2 className="text-lg font-semibold">
        Responsables por empresa y módulo
      </h2>
      <p className="text-sm text-zinc-600">
        Selecciona la empresa para revisar responsables y editar un módulo. El
        responsable necesita acceso y permiso de entrega previos.
      </p>
      <SelectField
        disabled={company.kind !== "all"}
        id="responsible-company"
        label="Empresa"
        onChange={(event) => setSelection(event.target.value)}
        value={selected}
      >
        <option value="">Seleccionar empresa</option>
        {context.companies.map((item) => (
          <option key={item.id} value={item.id}>
            {item.legal_name}
          </option>
        ))}
      </SelectField>
      {found ? (
        <Link
          className="inline-flex min-h-11 items-center rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white"
          href={`/empresas/${found.id}?tab=administracion`}
        >
          Configurar responsables de {found.legal_name} →
        </Link>
      ) : (
        <p className="text-sm text-zinc-500">
          {context.companies.length
            ? "Elige una empresa para continuar."
            : "Crea una empresa antes de configurar sus responsables."}
        </p>
      )}
    </section>
  );
}
