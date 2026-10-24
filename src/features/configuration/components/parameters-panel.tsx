"use client";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { SidePanel } from "@/components/organisms/side-panel";
import { LifecycleControl } from "@/features/access/components/lifecycle-control";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { ParametersForm } from "@/features/configuration/components/parameters-form";

export function ParametersPanel() {
  const { context } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const settings = context.organization.settings;
  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Parámetros del estudio</h2>
          <Button
            onClick={() => {
              setSaved(false);
              setEditing(true);
            }}
          >
            Editar parámetros
          </Button>
        </div>
        <p className="text-sm font-medium">{context.organization.name}</p>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt>Próximos vencimientos</dt>
          <dd>{settings.upcoming_days} días</dd>
          <dt>Resumen diario</dt>
          <dd>{settings.digest_local_time} · Lima</dd>
          <dt>Generación</dt>
          <dd>{settings.generation_local_time} · Lima</dd>
          <dt>Máximo por archivo</dt>
          <dd>{settings.default_max_file_bytes / 1_000_000} MB</dd>
          <dt>Formatos</dt>
          <dd className="break-words">
            {settings.allowed_formats.join(", ").toUpperCase()}
          </dd>
          <dt>Cumplimiento verde / amarillo</dt>
          <dd>
            {settings.compliance_thresholds.green}% /{" "}
            {settings.compliance_thresholds.yellow}%
          </dd>
        </dl>
      </section>
      {saved && (
        <FeedbackMessage kind="success">
          Parámetros actualizados.
        </FeedbackMessage>
      )}
      {editing && (
        <SidePanel title="Editar parámetros" onClose={() => setEditing(false)}>
          <ParametersForm
            key={context.organization.revision}
            onSaved={() => {
              setEditing(false);
              setSaved(true);
            }}
          />
        </SidePanel>
      )}
      <details className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
          Acciones de conservación del estudio
        </summary>
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
      </details>
    </div>
  );
}
