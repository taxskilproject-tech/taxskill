import { FORBIDDEN_FILTER_KEYS } from "@/lib/query/constants/query";
import type {
  DataScope,
  QueryFilters,
  ScopedQueryKey,
} from "@/lib/query/types/query.types";

export function createScopeIdentity(scope: DataScope | null): string {
  if (!scope) return "anonymous";

  const company =
    scope.company.kind === "company"
      ? scope.company.companyId
      : scope.company.kind;

  return JSON.stringify([
    scope.userId,
    scope.organizationId,
    scope.company.kind,
    company,
    scope.module,
    scope.authorization ?? "",
  ]);
}

export function createScopedQueryKey(
  scope: DataScope,
  resource: string,
  filters: QueryFilters = {},
): ScopedQueryKey {
  if (!scope.userId || !scope.organizationId || !resource.trim()) {
    throw new Error("La consulta necesita identidad y recurso válidos.");
  }

  const entries = Object.entries(filters);
  if (entries.some(([key]) => FORBIDDEN_FILTER_KEYS.test(key))) {
    throw new Error(
      "La clave de caché no admite credenciales ni URLs firmadas.",
    );
  }

  const normalized = Object.fromEntries(
    entries
      .filter(([, value]) => value !== undefined)
      .sort(([left], [right]) => left.localeCompare(right)),
  );

  return ["scope", createScopeIdentity(scope), resource, normalized];
}
