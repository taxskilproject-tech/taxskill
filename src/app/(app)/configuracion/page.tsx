import { Suspense } from "react";

import { ConfigurationPage } from "@/features/configuration/pages/configuration-page";

export const instant = false;

export default function Page() {
  return (
    <Suspense fallback={<p>Cargando configuración…</p>}>
      <ConfigurationPage />
    </Suspense>
  );
}
