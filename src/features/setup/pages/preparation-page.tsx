import { Badge } from "@/components/atoms/badge";
import { WorkspaceTemplate } from "@/components/templates/workspace-template";
import { ConnectionPanel } from "@/features/setup/components/connection-panel";
import { DatePreview } from "@/features/setup/components/date-preview";
import { ModuleOverview } from "@/features/setup/components/module-overview";

export function PreparationPage() {
  return (
    <WorkspaceTemplate status={<Badge>Entorno de desarrollo · H01</Badge>}>
      <div className="grid max-w-2xl gap-4">
        <p className="text-sm font-medium uppercase tracking-widest text-zinc-600">
          Preparación técnica
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Una base clara para trabajar.
        </h1>
        <p className="text-base leading-7 text-zinc-600">
          El punto de partida de tu sistema documental. Verifica la conexión y
          las convenciones de fecha antes de avanzar con los siguientes hitos.
        </p>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <ConnectionPanel />
        <DatePreview />
      </div>
      <ModuleOverview />
    </WorkspaceTemplate>
  );
}
