import { FOCUS_RING } from "@/components/constants/control-styles";
import type { WorkspaceTemplateProps } from "@/components/types/control.types";

export function WorkspaceTemplate({
  children,
  status,
}: WorkspaceTemplateProps) {
  return (
    <div className="min-h-dvh bg-zinc-50">
      <a
        className={`sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-lg focus:bg-white focus:p-3 ${FOCUS_RING}`}
        href="#contenido"
      >
        Saltar al contenido
      </a>
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-lg bg-blue-700 text-sm font-bold text-white"
            >
              TS
            </span>
            <span className="text-lg font-semibold tracking-tight">
              TaxSkills
            </span>
          </div>
          {status}
        </div>
      </header>
      <main
        className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 sm:py-14"
        id="contenido"
        tabIndex={-1}
      >
        {children}
      </main>
      <footer className="mx-auto max-w-6xl border-t border-zinc-200 px-5 py-6 text-sm text-zinc-600 sm:px-8">
        Gestión documental contable y laboral · Perú
      </footer>
    </div>
  );
}
