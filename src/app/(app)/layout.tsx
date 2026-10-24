import { ProtectedWorkspace } from "@/features/auth/components/protected-workspace";
import type { ProtectedWorkspaceProps } from "@/features/auth/types/auth.types";

// El acceso depende de Auth en navegador; no se pre-renderiza contenido de usuario.
export const instant = false;

export default function Layout({ children }: ProtectedWorkspaceProps) {
  return (
    <Suspense
      fallback={
        <ResourceState
          title="Preparando tu espacio…"
          description="Verificando acceso al estudio."
          kind="loading"
        />
      }
    >
      <ProtectedWorkspace>{children}</ProtectedWorkspace>
    </Suspense>
  );
}
import { Suspense } from "react";

import { ResourceState } from "@/components/organisms/resource-state";
