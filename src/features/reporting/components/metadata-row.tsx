import { Badge } from "@/components/atoms/badge";
import { RecordInspector } from "@/components/organisms/record-inspector";
import {
  moduleLabel,
  recordLabel,
  stateLabel,
} from "@/domain/reporting/utils/report-labels";
import { DocumentItem } from "@/features/documents/components/document-item";
import type { MetadataRowProps } from "@/features/reporting/types/metadata-ui.types";

export function MetadataRow({ document, origin }: MetadataRowProps) {
  return (
    <article className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1">
      <div className="min-w-0">
        <h2 className="break-words text-sm font-semibold">
          {document.original_name}
        </h2>
        <p className="text-xs text-slate-600">
          {document.company_name ?? "Interna del estudio"} · {document.period} ·
          Versión {document.version_number}
        </p>
        {!document.is_current && <Badge>Histórica</Badge>}
      </div>
      <RecordInspector title={document.original_name} label="Abrir archivo">
        <DocumentItem
          allowActions={document.record_status !== "deleted"}
          document={document}
          origin={origin}
        />
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
          <dt>Módulo</dt>
          <dd>{moduleLabel(document.module)}</dd>
          <dt>Periodo</dt>
          <dd>{document.period}</dd>
          <dt>Trabajador</dt>
          <dd>
            {document.worker_name || "No corresponde"}{" "}
            {document.worker_identity}
          </dd>
          <dt>Tipo documental</dt>
          <dd>{document.document_type}</dd>
          <dt>Estado de obligación</dt>
          <dd>{stateLabel(document.state)}</dd>
          <dt>Versión</dt>
          <dd>
            {document.version_number} ·{" "}
            {document.is_current ? "Actual" : "Histórica"}
          </dd>
          <dt>Registro</dt>
          <dd>{recordLabel(document.record_status)}</dd>
        </dl>
      </RecordInspector>
    </article>
  );
}
