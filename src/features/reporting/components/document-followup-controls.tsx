"use client";
import { useEffect } from "react";

import { Button } from "@/components/atoms/button";
import { FormField } from "@/components/molecules/form-field";
import { SelectField } from "@/components/molecules/select-field";
import { documentAssistantsSchema } from "@/domain/reporting/contracts/followup.schema";
import { QueryState } from "@/features/access/components/query-state";
import { useWorkspace } from "@/features/auth/providers/workspace-context";

import { useReportQuery } from "../hooks/use-report-query";
import type { DocumentFollowupControlsProps } from "../types/followup-ui.types";

export function DocumentFollowupControls({
  filters,
  onChange,
  onView,
  onInvalidAssistant,
}: DocumentFollowupControlsProps) {
  const { context } = useWorkspace();
  const personal = context.member.member_type === "client";
  const query = useReportQuery(
    "document_assistants",
    {
      company_id: filters.company_id,
      module: filters.module,
      include_deleted: filters.include_deleted,
    },
    documentAssistantsSchema,
    !personal,
  );
  useEffect(() => {
    if (
      !personal &&
      !query.isFetching &&
      query.data &&
      filters.assistant_id &&
      !query.data.rows.some((row) => row.user_id === filters.assistant_id)
    )
      onInvalidAssistant();
  }, [
    personal,
    query.isFetching,
    query.data,
    filters.assistant_id,
    onInvalidAssistant,
  ]);
  return (
    <div className="space-y-3">
      <nav aria-label="Vistas de Documentos" className="flex flex-wrap gap-2">
        <Button
          variant={
            filters.document_view !== "pending" ? "primary" : "secondary"
          }
          aria-current={
            filters.document_view !== "pending" ? "page" : undefined
          }
          onClick={() => onView("uploaded")}
        >
          Archivos subidos
        </Button>
        <Button
          variant={
            filters.document_view === "pending" ? "primary" : "secondary"
          }
          aria-current={
            filters.document_view === "pending" ? "page" : undefined
          }
          onClick={() => onView("pending")}
        >
          Pendientes de entrega
        </Button>
      </nav>
      <div className="grid grid-cols-2 items-end gap-2 [&>*]:min-w-0">
        {personal ? (
          <p className="text-sm">
            Asistente contable · {context.profile.full_name}
          </p>
        ) : (
          <QueryState
            loading={query.isPending}
            error={query.error}
            retrying={query.isFetching}
            onRetry={() => {
              void query.refetch();
            }}
          >
            <SelectField
              id="document-assistant"
              label="Asistente contable"
              value={filters.assistant_id ?? ""}
              onChange={(event) => onChange("assistant_id", event.target.value)}
            >
              <option value="">Todos</option>
              {query.data?.rows.map((row) => (
                <option key={row.user_id} value={row.user_id}>
                  {row.name} · {row.email}
                  {row.active ? "" : " · Histórico"}
                </option>
              ))}
            </SelectField>
          </QueryState>
        )}
        <FormField
          className="min-w-0"
          id="document-control-month"
          label="Periodo documental"
          type="month"
          value={filters.document_month ?? ""}
          min="1000-01"
          max="2999-12"
          onChange={(event) => onChange("document_month", event.target.value)}
        />
      </div>
    </div>
  );
}
