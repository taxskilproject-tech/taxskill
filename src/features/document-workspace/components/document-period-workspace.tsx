"use client";

import { Button } from "@/components/atoms/button";
import { ResourceState } from "@/components/organisms/resource-state";
import { documentPeriodWorkspaceSchema } from "@/domain/documents/contracts/document-workspace.schema";
import { QueryState } from "@/features/access/components/query-state";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { DocumentMonthPicker } from "@/features/document-workspace/components/document-month-picker";
import { DocumentPeriodResults } from "@/features/document-workspace/components/document-period-results";
import { DocumentWorkspaceControls } from "@/features/document-workspace/components/document-workspace-controls";
import { useDocumentPeriodNavigation } from "@/features/document-workspace/hooks/use-document-period-navigation";
import type { DocumentPeriodWorkspaceProps } from "@/features/document-workspace/types/document-workspace-ui.types";
import { limaDocumentYear } from "@/features/document-workspace/utils/document-period-presentation";
import { documentWorkspaceMode } from "@/features/document-workspace/utils/document-workspace-mode";
import { useDocumentQuery } from "@/features/documents/hooks/use-document-query";

export function DocumentPeriodWorkspace(props: DocumentPeriodWorkspaceProps) {
  const { companyId, module, workerId, employmentPeriodId } = props;
  const navigation = useDocumentPeriodNavigation();
  const { context } = useWorkspace();
  const mode = documentWorkspaceMode(props, navigation);
  const query = useDocumentQuery(
    "document_workspace",
    {
      company_id: companyId,
      module,
      worker_id: workerId,
      employment_period_id: employmentPeriodId,
      employment_stage: mode.stage,
      year: navigation.year,
      month: mode.calendar ? (navigation.month ?? undefined) : undefined,
      document_code: navigation.code || undefined,
      document_scope: mode.scope,
      state: navigation.state,
      page: navigation.page,
    },
    documentPeriodWorkspaceSchema,
    !navigation.invalid,
  );
  if (navigation.invalid)
    return (
      <ResourceState
        kind="error"
        title="Periodo o filtro inválido"
        description="Selecciona de nuevo el periodo de trabajo."
        action={
          <Button
            onClick={() =>
              navigation.select(
                "documentYear",
                String(limaDocumentYear(new Date())),
              )
            }
          >
            Seleccionar otro periodo
          </Button>
        }
      />
    );
  return (
    <div className="space-y-3">
      <DocumentWorkspaceControls
        navigation={navigation}
        mode={mode}
        years={query.data?.years ?? [navigation.year]}
      />
      <QueryState
        error={query.error}
        loading={query.isPending}
        retrying={query.isFetching}
        onRetry={() => {
          void query.refetch();
        }}
      >
        {query.data &&
          (mode.calendar && navigation.month === null ? (
            <DocumentMonthPicker
              year={navigation.year}
              months={query.data.months}
              onMonth={(month) => navigation.select("documentMonth", month)}
            />
          ) : (
            <DocumentPeriodResults
              data={query.data}
              navigation={navigation}
              companyId={companyId}
              isAdmin={context.member.is_admin}
              calendar={mode.calendar}
            />
          ))}
      </QueryState>
    </div>
  );
}
