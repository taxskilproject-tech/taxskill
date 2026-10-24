"use client";
import { useState } from "react";

import { CheckboxField } from "@/components/molecules/checkbox-field";
import { FormField } from "@/components/molecules/form-field";
import { SelectField } from "@/components/molecules/select-field";
import {
  DOCUMENT_MODULES,
  MODULE_LABELS,
} from "@/domain/documents/constants/engine";
import { documentTypeInputSchema } from "@/domain/documents/contracts/document.schema";
import { FormActions } from "@/features/access/components/form-actions";
import type { SubmitEvent } from "@/features/access/types/access-ui.types";
import { parseForm, readForm } from "@/features/access/utils/form-data";
import { FormatFields } from "@/features/documents/components/format-fields";
import { useDocumentCommand } from "@/features/documents/hooks/use-document-command";
import type { CatalogFormProps } from "@/features/documents/types/document-ui.types";

export function CatalogForm({ item, onSaved, onCancel }: CatalogFormProps) {
  const command = useDocumentCommand();
  const [validation, setValidation] = useState<string | null>(null);
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = parseForm(documentTypeInputSchema, {
      ...readForm(event.currentTarget),
      module: item?.module ?? data.get("module"),
      category: String(data.get("category") ?? "").trim() || null,
      description: String(data.get("description") ?? "") || null,
      suggested_formats: data.getAll("suggested_formats"),
      active: data.has("active"),
      ...(item ? { id: item.id, expected_revision: item.revision } : {}),
    });
    setValidation(parsed.error);
    if (parsed.data && (await command.submit("SaveDocumentType", parsed.data)))
      onSaved();
  }
  return (
    <form
      className="space-y-5 rounded-xl border border-zinc-200 bg-white p-5"
      onSubmit={submit}
    >
      <h2 className="text-lg font-semibold">
        {item ? "Editar tipo documental" : "Nuevo tipo documental"}
      </h2>
      <fieldset className="space-y-4" disabled={command.busy}>
        <SelectField
          defaultValue={item?.module ?? "tributario"}
          disabled={Boolean(item)}
          id="document-module"
          label="Módulo documental"
          name="module"
        >
          {DOCUMENT_MODULES.map((module) => (
            <option key={module} value={module}>
              {MODULE_LABELS[module]}
            </option>
          ))}
        </SelectField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            defaultValue={item?.code}
            id="document-code"
            label="Código estable"
            maxLength={60}
            name="code"
            required
          />
          <FormField
            defaultValue={item?.name}
            id="document-name"
            label="Nombre"
            maxLength={150}
            name="name"
            required
          />
        </div>
        <FormField
          defaultValue={item?.description ?? ""}
          id="document-description"
          label="Descripción"
          maxLength={1000}
          name="description"
        />
        <FormField
          defaultValue={item?.category ?? ""}
          id="document-category"
          label="Categoría (opcional)"
          maxLength={100}
          name="category"
        />
        <FormatFields
          name="suggested_formats"
          selected={item?.suggested_formats}
        />
        <CheckboxField
          defaultChecked={item?.active ?? true}
          id="document-active"
          label="Tipo habilitado para nuevas reglas"
          name="active"
        />
      </fieldset>
      <FormActions
        busy={command.busy}
        error={validation ?? command.error}
        onCancel={onCancel}
      />
    </form>
  );
}
