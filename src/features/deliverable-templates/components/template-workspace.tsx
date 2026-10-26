import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { SidePanel } from "@/components/organisms/side-panel";
import {
  emptyChecklist,
  parseChecklist,
} from "@/domain/company-profile/utils/profile";
import type { TemplateItem } from "@/domain/documents/types/template.types";
import { useCommand } from "@/features/access/hooks/use-command";
import { CompanyChecklist } from "@/features/deliverable-templates/components/company-checklist";
import { TemplateAdd } from "@/features/deliverable-templates/components/template-add";
import { TemplateEditor } from "@/features/deliverable-templates/components/template-editor";
import { TemplateItems } from "@/features/deliverable-templates/components/template-items";
import { TemplatePreview } from "@/features/deliverable-templates/components/template-preview";
import type { TemplateWorkspaceProps } from "@/features/deliverable-templates/types/template-ui.types";
import { catalogTemplateItem } from "@/features/deliverable-templates/utils/template-presentation";

export function TemplateWorkspace({
  template,
  onChanged,
}: TemplateWorkspaceProps) {
  const command = useCommand();
  const [selected, setSelected] = useState<TemplateItem>();
  const [adding, setAdding] = useState(false);
  const [preview, setPreview] = useState(false);
  const [checklist, setChecklist] = useState(emptyChecklist);
  const version = template.latest;
  const profile = parseChecklist(checklist);
  async function save(items: TemplateItem[]) {
    const succeeded = await command.submit("SaveDeliverableTemplate", {
      template_id: template.id,
      version_id: version.id,
      expected_revision: version.revision,
      items,
    });
    if (succeeded) {
      setSelected(undefined);
      setAdding(false);
      onChanged();
    }
    return succeeded;
  }
  async function publish() {
    if (
      await command.submit("PublishDeliverableTemplate", {
        template_id: template.id,
        version_id: version.id,
        expected_revision: version.revision,
      })
    )
      onChanged();
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          Versión {version.version_number} ·{" "}
          {version.published_at ? "Publicada" : "Borrador"}
          {template.published && !version.published_at
            ? ` · Empresas nuevas usan la versión ${template.published.version_number} hasta publicar`
            : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setPreview(true)}>
            Vista previa del checklist
          </Button>
          <Button variant="secondary" onClick={() => setAdding(true)}>
            Agregar entregable
          </Button>
          {!version.published_at && (
            <Button
              disabled={version.issues.length > 0}
              loading={command.busy}
              loadingText="Publicando plantilla…"
              onClick={() => {
                void publish();
              }}
            >
              Publicar versión
            </Button>
          )}
        </div>
      </div>
      {version.issues.length > 0 && (
        <FeedbackMessage kind="info">
          {version.issues.length} configuraciones pendientes. Abre los
          entregables indicados para completarlas antes de publicar.
        </FeedbackMessage>
      )}
      {command.error && (
        <FeedbackMessage kind="error">{command.error}</FeedbackMessage>
      )}
      <TemplateItems
        items={version.items}
        issues={version.issues}
        onEdit={setSelected}
      />
      {selected && (
        <SidePanel
          title={selected.name}
          wide
          onClose={() => setSelected(undefined)}
        >
          <TemplateEditor
            key={`${version.id}:${selected.code}`}
            item={selected}
            busy={command.busy}
            error={command.error}
            onCancel={() => setSelected(undefined)}
            onSave={(item) =>
              save(
                version.items.map((current) =>
                  current.code === item.code ? item : current,
                ),
              )
            }
          />
        </SidePanel>
      )}
      {adding && (
        <SidePanel
          title="Agregar a la plantilla"
          onClose={() => setAdding(false)}
        >
          <TemplateAdd
            error={command.error}
            items={version.items}
            busy={command.busy}
            onAdd={(item) => {
              void save([
                ...version.items,
                catalogTemplateItem(
                  item,
                  Math.max(
                    0,
                    ...version.items.map((current) => current.position),
                  ) + 1,
                ),
              ]);
            }}
          />
        </SidePanel>
      )}
      {preview && (
        <SidePanel
          title="Vista previa · sin guardar"
          onClose={() => setPreview(false)}
          wide
        >
          <div className="space-y-4">
            <CompanyChecklist value={checklist} onChange={setChecklist} />
            {profile.success ? (
              <TemplatePreview items={version.items} profile={profile.data} />
            ) : (
              <p className="text-sm">
                Completa el checklist para ver los entregables aplicables. Esta
                vista no crea empresas ni obligaciones.
              </p>
            )}
          </div>
        </SidePanel>
      )}
    </div>
  );
}
