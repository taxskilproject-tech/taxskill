import Link from "next/link";

import { FOCUS_RING } from "@/components/constants/control-styles";
import { ResourceState } from "@/components/organisms/resource-state";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <ResourceState
        action={
          <Link
            className={`text-sm font-medium underline underline-offset-4 ${FOCUS_RING}`}
            href="/"
          >
            Volver al inicio
          </Link>
        }
        description="La dirección solicitada no está disponible."
        kind="not-found"
        title="Página no encontrada"
      />
    </main>
  );
}
