"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { SelectField } from "@/components/molecules/select-field";
import { eligibleResponsibles } from "@/domain/access/utils/eligible-responsibles";
import { DOCUMENT_MODULES } from "@/domain/common/constants/modules";
import { FormActions } from "@/features/access/components/form-actions";
import { LifecycleControl } from "@/features/access/components/lifecycle-control";
import { useCommand } from "@/features/access/hooks/use-command";
import type {
  ResponsibleFormProps,
  SubmitEvent,
} from "@/features/access/types/access-ui.types";
import { loadCompanyAccess } from "@/features/companies/repositories/company-access.repository";
import { useDataScope } from "@/lib/query/hooks/use-data-scope";
import { createScopedQueryKey } from "@/lib/query/utils/query-keys";

export function ResponsibleForm({
  company,
  module,
  current,
  directory,
  onSaved,
}: ResponsibleFormProps) {
  const command = useCommand();
  const scope = useDataScope();
  const [responsibleId, setResponsibleId] = useState(
    current?.delivery_responsible_id ?? "",
  );
  const access = useQuery({
    queryKey: createScopedQueryKey(scope!, "company-access", {
      companyId: company.id,
    }),
    queryFn: ({ signal }) =>
      loadCompanyAccess(company.organization_id, company.id, signal),
  });
  const candidates = eligibleResponsibles(
    directory,
    access.data?.grants ?? [],
    access.data?.overrides ?? [],
    module,
  );
  const moduleName =
    DOCUMENT_MODULES.find((item) => item.id === module)?.name ?? module;
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const deliveryResponsibleId = String(
      new FormData(event.currentTarget).get("delivery_responsible_id"),
    );
    if (
      await command.submit("SaveModuleSettings", {
        company_id: company.id,
        module,
        delivery_responsible_id: deliveryResponsibleId,
        ...(current
          ? { id: current.id, expected_revision: current.revision }
          : {}),
      })
    )
      onSaved();
  }
  if (current?.deleted_at)
    return (
      <div className="space-y-3 rounded-lg border border-zinc-200 p-5">
        <h3 className="font-medium">{moduleName} · Configuración eliminada</h3>
        <LifecycleControl
          deleted
          entity="company_module_settings"
          id={current.id}
          onChanged={onSaved}
          revision={current.revision}
        />
      </div>
    );
  return (
    <form
      className="space-y-4 rounded-lg border border-zinc-200 p-5"
      onSubmit={submit}
    >
      <h3 className="font-medium">{moduleName}</h3>
      <SelectField
        value={responsibleId}
        onChange={(event) => setResponsibleId(event.target.value)}
        disabled={command.busy || access.isPending || Boolean(access.error)}
        id={`responsible-${module}`}
        label="Responsable de entrega"
        name="delivery_responsible_id"
        required
      >
        <option value="">Seleccionar usuario elegible</option>
        {candidates.map((profile) => (
          <option key={profile.user_id} value={profile.user_id}>
            {profile.full_name}
          </option>
        ))}
      </SelectField>
      <p className="text-xs leading-5 text-zinc-500">
        {access.isPending
          ? "Consultando usuarios elegibles…"
          : access.error
            ? "No se pudieron consultar los accesos. Recarga la información."
            : !candidates.length
              ? "Asigna primero un usuario con permiso de entrega en este módulo."
              : "Esta responsabilidad se heredará en nuevas obligaciones."}
      </p>
      <FormActions
        busy={command.busy}
        disabled={
          access.isPending || Boolean(access.error) || !candidates.length
        }
        error={command.error}
        label="Guardar responsable"
        loadingText="Guardando responsable…"
        success={command.result ? "Responsable actualizado." : undefined}
      />
      {current && (
        <LifecycleControl
          deleted={false}
          entity="company_module_settings"
          id={current.id}
          onChanged={onSaved}
          revision={current.revision}
        />
      )}
    </form>
  );
}
