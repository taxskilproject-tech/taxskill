"use client";
import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { sunatAccessSchema } from "@/domain/sunat/contracts/sunat.schema";
import { QueryState } from "@/features/access/components/query-state";
import { useSunatAction } from "@/features/sunat-mailbox/hooks/use-sunat-action";
import { useSunatQuery } from "@/features/sunat-mailbox/hooks/use-sunat-query";
import type {
  SunatAccessRowProps,
  SunatMemberAccessProps,
} from "@/features/sunat-mailbox/types/ui.types";

function AccessRow({ row, memberId, onChanged }: SunatAccessRowProps) {
  const action = useSunatAction();
  async function toggle() {
    const saved = await action.submit("SetAccess", {
      company_id: row.company_id,
      member_id: memberId,
      allowed: !row.allowed,
      expected_revision: row.revision,
    });
    if (saved) onChanged();
  }
  return (
    <li className="rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{row.legal_name}</p>
          <p className="text-xs text-slate-600">
            {row.ruc} ·{" "}
            {row.allowed ? "Acceso permitido" : "Sin permiso de buzón"}
          </p>
        </div>
        <Button
          variant="secondary"
          loading={action.busy}
          loadingText="Guardando permiso…"
          onClick={() => {
            void toggle();
          }}
        >
          {row.allowed ? "Quitar permiso" : "Permitir consulta"}
        </Button>
      </div>
      {action.error && (
        <FeedbackMessage kind="error">{action.error}</FeedbackMessage>
      )}
    </li>
  );
}

export function SunatUserAccess({
  memberId,
  onChanged,
}: SunatMemberAccessProps) {
  const query = useSunatQuery(
    "access",
    { member_id: memberId },
    sunatAccessSchema,
  );
  function refresh() {
    void query.refetch();
    onChanged();
  }
  return (
    <section className="space-y-3">
      <p className="text-sm text-slate-600">
        Permite consultar y descargar el buzón de empresas ya asignadas. Este
        permiso no permite ver ni cambiar claves SOL.
      </p>
      <QueryState
        loading={query.isPending}
        error={query.error}
        retrying={query.isFetching}
        onRetry={() => {
          void query.refetch();
        }}
      >
        {query.data?.is_admin ? (
          <FeedbackMessage>
            El administrador tiene acceso a todas las empresas del estudio.
          </FeedbackMessage>
        ) : (
          <ul className="space-y-2">
            {query.data?.rows.map((row) => (
              <AccessRow
                key={row.company_id}
                memberId={memberId}
                row={row}
                onChanged={refresh}
              />
            ))}
          </ul>
        )}
        {query.data?.rows.length === 0 && !query.data.is_admin && (
          <FeedbackMessage>
            Asigna primero una empresa con permiso de consulta documental. Solo
            se admite equipo interno activo.
          </FeedbackMessage>
        )}
      </QueryState>
    </section>
  );
}
