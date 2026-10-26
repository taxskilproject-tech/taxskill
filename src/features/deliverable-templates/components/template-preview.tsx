import type { TemplatePreviewProps } from "@/features/deliverable-templates/types/template-ui.types";
import {
  applicableTemplateItems,
  templatePreviewGroups,
} from "@/features/deliverable-templates/utils/template-presentation";

export function TemplatePreview({ items, profile }: TemplatePreviewProps) {
  const applicable = applicableTemplateItems(items, profile);
  return (
    <section
      className="space-y-3"
      aria-label="Entregables que recibirá la empresa"
    >
      <p className="text-sm font-medium">
        {applicable.length} entregables aplicables · Pendientes de responsable
        al crear la empresa
      </p>
      {templatePreviewGroups(items, profile).map((group) => {
        return (
          <details
            key={group.id}
            open
            className="rounded-lg border border-slate-200 p-3"
          >
            <summary className="min-h-11 cursor-pointer font-medium">
              {group.label} · {group.items.length}
            </summary>
            <ol className="divide-y divide-slate-100">
              {group.items.map((item, index) => (
                <li key={item.code} className="flex gap-2 py-2 text-sm">
                  <span className="font-semibold text-blue-800">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {item.name}
                </li>
              ))}
            </ol>
          </details>
        );
      })}
    </section>
  );
}
