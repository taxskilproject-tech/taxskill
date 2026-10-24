"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { ActivityFilterName } from "@/domain/activities/types/activity.types";
import {
  parseActivityFilters,
  serializeActivityFilters,
} from "@/domain/activities/utils/activity-filters";
import { useCurrentRoute } from "@/features/access/hooks/use-current-route";
import { useWorkspace } from "@/features/auth/providers/workspace-context";

export function useActivityFilters(fixedCompanyId?: string) {
  const { company, context } = useWorkspace();
  const parameters = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const origin = useCurrentRoute();
  const parsed = parseActivityFilters(
    new URLSearchParams(parameters.toString()),
  );
  const lockedCompanyId =
    fixedCompanyId ??
    (company.kind === "company" ? company.companyId : undefined);
  const internal = !fixedCompanyId && company.kind === "internal";
  const filters = {
    ...parsed,
    ...(lockedCompanyId
      ? { companyId: lockedCompanyId, scope: "company" as const }
      : {}),
    ...(internal ? { companyId: undefined, scope: "internal" as const } : {}),
    ...(context.member.member_type === "client" && parsed.scope === "internal"
      ? { scope: "all" as const }
      : {}),
  };
  function change(name: ActivityFilterName, value: string) {
    const next = new URLSearchParams(serializeActivityFilters(filters));
    if (value) next.set(name, value);
    else next.delete(name);
    if (name === "companyId") next.set("scope", value ? "company" : "all");
    if (name !== "page") next.set("page", "1");
    const sanitized = serializeActivityFilters(parseActivityFilters(next));
    const tabs = fixedCompanyId ? "tab=actividades&" : "";
    router.replace(`${pathname}?${tabs}${sanitized}`, { scroll: false });
  }
  return {
    filters,
    change,
    lockedCompany: Boolean(lockedCompanyId) || internal,
    origin,
  };
}
