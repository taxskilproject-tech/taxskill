"use client";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { RecordInspector } from "@/components/organisms/record-inspector";
import { MODULE_LABELS } from "@/domain/documents/constants/engine";
import { DocumentLifecycle } from "@/features/documents/components/document-lifecycle";
import type { CatalogItemProps } from "@/features/documents/types/document-ui.types";

export function CatalogItem({ item, onEdit }: CatalogItemProps) {
  return (
    <article className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold">{item.name}</h3>
        <p className="text-xs text-slate-600">
          {MODULE_LABELS[item.module]} ·{" "}
          {item.suggested_formats.join(", ").toUpperCase()}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="shrink-0">
          <Badge
            tone={
              item.deleted_at ? "neutral" : item.active ? "success" : "warning"
            }
          >
            {item.deleted_at
              ? "Eliminado"
              : item.active
                ? "Habilitado"
                : "Pausado"}
          </Badge>
        </span>
        <RecordInspector title={item.name} label="Gestionar">
          <p className="mb-3 text-sm text-slate-600">
            Código: {item.code} · {item.active ? "Habilitado" : "Pausado"}
            {item.deleted_at ? " · Eliminado" : ""}
          </p>
          {item.deletion_reason && (
            <p className="mb-3 text-sm">{item.deletion_reason}</p>
          )}
          {!item.deleted_at && (
            <Button onClick={onEdit} variant="secondary">
              Editar tipo documental
            </Button>
          )}
          <details className="mt-4">
            <summary className="min-h-11 cursor-pointer py-3 text-sm">
              Conservación y restauración
            </summary>
            <DocumentLifecycle
              deleted={Boolean(item.deleted_at)}
              entity="document_types"
              id={item.id}
              revision={item.revision}
            />
          </details>
        </RecordInspector>
      </div>
    </article>
  );
}
