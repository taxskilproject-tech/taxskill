"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import type { SessionContext } from "@/features/auth/types/auth.types";
import type { RememberedCompany } from "@/features/auth/types/company-context.types";
import {
  companyChangeDestination,
  companyScope,
  selectedCompany,
} from "@/features/auth/utils/company-navigation";
import { workspaceRoute } from "@/features/auth/utils/workspace-route";

export function useCompanyContext(context: SessionContext | null) {
  const pathname = usePathname();
  const parameters = useSearchParams();
  const router = useRouter();
  const route = workspaceRoute(
    pathname,
    new URLSearchParams(parameters.toString()),
  );
  const address = `${pathname}?${parameters}`;
  const identity = context
    ? `${context.profile.user_id}:${context.organization.id}`
    : "anonymous";
  const [remembered, setRemembered] = useState<RememberedCompany>({
    identity,
    route: address,
    selection: "all",
  });
  const selection = selectedCompany(
    context,
    remembered.identity === identity ? remembered.selection : "all",
    route,
  );
  // Resolve the URL before rendering scoped queries; remember it for transverse pages.
  if (
    remembered.identity !== identity ||
    remembered.route !== address ||
    remembered.selection !== selection
  )
    setRemembered({ identity, route: address, selection });
  function selectCompany(value: string) {
    const next = selectedCompany(context, value, {
      companyId: null,
      module: route.module,
      picker: false,
    });
    setRemembered({ identity, route: address, selection: next });
    const destination = companyChangeDestination(pathname, route, next);
    if (destination) router.replace(destination);
  }
  return {
    company: companyScope(selection),
    module: route.module,
    selectCompany,
  };
}
