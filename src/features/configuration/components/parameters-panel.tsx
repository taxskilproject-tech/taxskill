"use client";

import { LifecycleControl } from "@/features/access/components/lifecycle-control";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { HistoryPanel } from "@/features/configuration/components/history-panel";
import { ParametersForm } from "@/features/configuration/components/parameters-form";

export function ParametersPanel() {
  const { context } = useWorkspace();
  return (
    <div className="space-y-6">
      <ParametersForm key={context.organization.revision} />
      <HistoryPanel />
      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-semibold">Conservación del estudio</h2>
        <p className="text-sm leading-6 text-zinc-500">
          La eliminación lógica bloquea la operación de todas sus empresas.
          Mantiene sus datos y permite la restauración administrativa, sin
          restaurar hijos eliminados por separado.
        </p>
        <LifecycleControl
          deleted={false}
          entity="organizations"
          id={context.organization.id}
          onChanged={() => undefined}
          revision={context.organization.revision}
        />
      </section>
    </div>
  );
}
