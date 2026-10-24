"use client";
import { useState } from "react";

import { SelectField } from "@/components/molecules/select-field";
import { MODULE_LABELS } from "@/domain/documents/constants/engine";
import type { CatalogRow } from "@/domain/documents/types/document.types";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import type { RuleDestinationProps } from "@/features/documents/types/document-ui.types";

export function RuleDestinationFields({
  catalog,
  rule,
  companyId,
  onCompany,
  onModule,
}: RuleDestinationProps) {
  const { context } = useWorkspace();
  const [selected, setSelected] = useState<CatalogRow>();
  const value = selected?.id ?? rule?.document_type_id ?? "";
  const options =
    selected && !catalog.some((item) => item.id === selected.id)
      ? [selected, ...catalog]
      : catalog;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {rule && (
        <>
          <input name="company_id" type="hidden" value={rule.company_id} />
          <input
            name="document_type_id"
            type="hidden"
            value={rule.document_type_id}
          />
        </>
      )}
      <SelectField
        disabled={Boolean(rule)}
        id="rule-company"
        label="Empresa"
        name="company_id"
        onChange={(event) => onCompany(event.target.value)}
        required
        value={companyId}
      >
        <option value="">Seleccionar empresa activa</option>
        {context.companies
          .filter((item) => item.status === "active")
          .map((item) => (
            <option key={item.id} value={item.id}>
              {item.legal_name}
            </option>
          ))}
      </SelectField>
      <SelectField
        value={value}
        disabled={Boolean(rule)}
        id="rule-document"
        label="Tipo documental y módulo"
        name="document_type_id"
        onChange={(event) => {
          const type = catalog.find((item) => item.id === event.target.value);
          setSelected(type);
          if (type) onModule(type.module);
        }}
        required
      >
        <option value="">Seleccionar tipo habilitado</option>
        {rule && !options.some((item) => item.id === rule.document_type_id) && (
          <option value={rule.document_type_id}>Tipo de la regla actual</option>
        )}
        {options
          .filter(
            (item) =>
              (item.active && !item.deleted_at) ||
              item.id === rule?.document_type_id,
          )
          .map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {MODULE_LABELS[item.module]}
            </option>
          ))}
      </SelectField>
    </div>
  );
}
