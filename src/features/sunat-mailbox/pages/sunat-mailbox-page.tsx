"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";

import { ResourceState } from "@/components/organisms/resource-state";
import { canReadSunat } from "@/domain/sunat/utils/access";
import { useWorkspace } from "@/features/auth/providers/workspace-context";

import { SunatCompanyPicker } from "../components/company-picker";
import { SunatCompanyWorkspace } from "../components/company-workspace";

export function SunatMailboxPage() {
  const { context, company } = useWorkspace();
  const parameters = useSearchParams();
  const requested = parameters.get("companyId");
  const requestedValid =
    requested &&
    z.uuid().safeParse(requested).success &&
    context.companies.some(
      (item) => item.id === requested && item.status === "active",
    ) &&
    canReadSunat(context, requested);
  if (!canReadSunat(context) || (requested && !requestedValid))
    return (
      <ResourceState
        kind="forbidden"
        title="Acceso restringido al Buzón SUNAT"
        description="Necesitas asignación a la empresa y el permiso específico del buzón. El responsable de entregas no recibe ese permiso automáticamente."
        action={
          <Link
            className="inline-flex min-h-11 items-center underline"
            href="/buzon-sunat"
          >
            Elegir otra empresa
          </Link>
        }
      />
    );
  if (company.kind !== "company") return <SunatCompanyPicker />;
  if (!canReadSunat(context, company.companyId)) return <SunatCompanyPicker />;
  return (
    <SunatCompanyWorkspace
      companyId={company.companyId}
      key={company.companyId}
    />
  );
}
