"use client";

import { Button } from "@/components/atoms/button";
import { ResourceState } from "@/components/organisms/resource-state";
import type { ErrorPageProps } from "@/features/setup/types/error-page.types";

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <ResourceState
        action={<Button onClick={reset}>Volver a intentar</Button>}
        description="No se pudo mostrar esta página. Inténtalo de nuevo."
        kind="error"
        title="Ocurrió un problema"
      />
    </main>
  );
}
