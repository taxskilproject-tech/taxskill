import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { SUNAT_MAILBOX_LABELS } from "@/domain/sunat/constants/sunat";

import type { SunatListProps } from "../types/ui.types";

export function SunatMessageList({ data, onOpen }: SunatListProps) {
  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {data.rows.map((message) => (
        <li
          className="flex items-start justify-between gap-3 px-3 py-3 sm:px-4"
          key={message.id}
        >
          <div className="min-w-0 space-y-1">
            <p className="text-xs text-slate-600">
              {message.published_on.split("-").reverse().join("/")} ·{" "}
              {SUNAT_MAILBOX_LABELS[message.mailbox]}
            </p>
            <p className="break-words text-sm font-medium">{message.subject}</p>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <Badge tone={message.source_read ? "neutral" : "blue"}>
                {message.source_read ? "Leído en SUNAT" : "Sin leer en SUNAT"}
              </Badge>
              {message.has_attachments && <span>Con adjuntos</span>}
            </div>
          </div>
          <Button variant="secondary" onClick={() => onOpen(message.id)}>
            Abrir
          </Button>
        </li>
      ))}
    </ul>
  );
}
