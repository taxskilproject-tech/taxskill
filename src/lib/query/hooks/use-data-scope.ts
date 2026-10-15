"use client";

import { use } from "react";

import { QueryScopeContext } from "@/lib/query/query-scope-context";

export function useDataScope() {
  const scope = use(QueryScopeContext);

  if (scope === undefined) {
    throw new Error("La consulta debe estar dentro de QueryProvider.");
  }

  return scope;
}
