"use client";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { DocumentLifecycle } from "@/features/documents/components/document-lifecycle";
import type { CatalogItemProps } from "@/features/documents/types/document-ui.types";

export function CatalogItem({ item, onEdit }: CatalogItemProps) {
  return (
    <article className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{item.name}</h3>
          <p className="mt-2 text-sm text-zinc-600">
            {item.code} · {item.suggested_formats.join(", ").toUpperCase()}
          </p>
        </div>
        <Badge>
          {item.deleted_at
            ? "Eliminado"
            : item.active
              ? "Habilitado"
              : "Pausado"}
        </Badge>
      </div>
      {item.deletion_reason && (
        <p className="text-sm text-zinc-600">{item.deletion_reason}</p>
      )}
      <div className="flex flex-wrap gap-3">
        {!item.deleted_at && (
          <Button onClick={onEdit} variant="secondary">
            Editar
          </Button>
        )}
        <DocumentLifecycle
          deleted={Boolean(item.deleted_at)}
          entity="document_types"
          id={item.id}
          revision={item.revision}
        />
      </div>
    </article>
  );
}
