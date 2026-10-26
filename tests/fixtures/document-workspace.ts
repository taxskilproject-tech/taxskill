import type { DocumentPeriodWorkspaceData } from "@/domain/documents/types/document-workspace.types";

import { fixtureId } from "./access";

export const documentPeriodWorkspaceFixture: DocumentPeriodWorkspaceData = {
  years: [2026, 2025],
  months: Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    count: index === 9 ? 1 : 0,
  })),
  groups: [
    {
      code: "tributario_pdt",
      name: "PDT",
      count: 1,
      approved_files: 0,
      total_files: 2,
    },
  ],
  selected_code: "tributario_pdt",
  count: 1,
  rows: [
    {
      id: fixtureId,
      organization_id: fixtureId,
      company_id: fixtureId,
      module: "tributario",
      title: "PDT mensual",
      description: null,
      company_name: "Empresa ficticia",
      occurrence_key: "2026-10",
      initial_due_date: "2026-11-10",
      operational_due_date: "2026-11-10",
      delivery_responsible_id: fixtureId,
      assignment_issue: false,
      priority: "media",
      is_required: true,
      disposition: "active",
      disposition_reason: null,
      aggregate_state: "pendiente",
      approved_count: 0,
      total_count: 2,
      observed_count: 0,
      pending_count: 2,
      overdue: false,
      revision: 0,
      document_code: "tributario_pdt",
      document_name: "PDT",
      period_kind: "monthly",
      period_start: "2026-10-01",
      period_end: "2026-10-31",
      files: [
        {
          id: fixtureId,
          label: "PDT 1",
          display_order: 1,
          review_state: "pendiente",
          due_date: "2026-11-10",
          formats: ["pdf"],
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          label: "PDT 2",
          display_order: 2,
          review_state: "pendiente",
          due_date: "2026-11-10",
          formats: ["pdf"],
        },
      ],
    },
  ],
};
