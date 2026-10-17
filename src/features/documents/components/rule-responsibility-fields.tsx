"use client";
import Link from "next/link";
import { useState } from "react";

import { CheckboxField } from "@/components/molecules/checkbox-field";
import { ResponsiblePicker } from "@/features/documents/components/responsible-picker";
import type { RuleResponsibilityProps } from "@/features/documents/types/engine-ui.types";

export function RuleResponsibilityFields({
  companyId,
  module,
  rule,
}: RuleResponsibilityProps) {
  const [inherit, setInherit] = useState(rule?.inherit_responsible ?? true);
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold">
        Responsabilidad de entrega
      </legend>
      <CheckboxField
        checked={inherit}
        id="rule-inherit"
        label="Heredar el responsable de empresa y módulo"
        name="inherit_responsible"
        onChange={(event) => setInherit(event.target.checked)}
      />
      {inherit ? (
        <p className="text-sm text-zinc-600">
          Debe tener permiso de carga al activar.{" "}
          <Link className="underline underline-offset-4" href="/empresas">
            Configurar responsables por empresa
          </Link>
          .
        </p>
      ) : (
        <ResponsiblePicker
          companyId={companyId}
          key={`${companyId}:${module}`}
          module={module}
          selected={rule?.delivery_responsible_id}
        />
      )}
    </fieldset>
  );
}
