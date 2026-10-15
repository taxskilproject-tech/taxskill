"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { QueryScopeContext } from "@/lib/query/query-scope-context";
import type { QueryProviderProps } from "@/lib/query/types/query.types";
import { createQueryClient } from "@/lib/query/utils/create-query-client";
import { createScopeIdentity } from "@/lib/query/utils/query-keys";

function ScopedProvider({ children, scope }: QueryProviderProps) {
  const [client] = useState(createQueryClient);

  useEffect(() => () => client.clear(), [client]);

  return (
    <QueryClientProvider client={client}>
      <QueryScopeContext value={scope}>{children}</QueryScopeContext>
    </QueryClientProvider>
  );
}

export function QueryProvider({ children, scope }: QueryProviderProps) {
  // Otra identidad remonta hooks/formularios y descarta toda la caché anterior.
  return (
    <ScopedProvider key={createScopeIdentity(scope)} scope={scope}>
      {children}
    </ScopedProvider>
  );
}
