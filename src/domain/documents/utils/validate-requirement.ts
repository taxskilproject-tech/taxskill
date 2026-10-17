import type { z } from "zod";

import type { RequirementValidationInput } from "@/domain/documents/types/requirement-validation.types";

export function validateRequirement(
  value: RequirementValidationInput,
  context: z.RefinementCtx,
) {
  const invalid = (message: string) =>
    context.addIssue({ code: "custom", message });
  if (!value.inherit_responsible && !value.delivery_responsible_id)
    invalid("Selecciona un responsable explícito.");
  if (
    value.frequency === "personalizada" &&
    (!value.interval_count || !value.interval_unit || !value.anchor_date)
  )
    invalid("El intervalo requiere cantidad positiva, unidad y fecha ancla.");
  if (
    value.frequency !== "personalizada" &&
    (value.interval_count !== null || value.interval_unit !== null)
  )
    invalid("Solo la frecuencia personalizada admite intervalos.");
  if (
    value.frequency === "unica" &&
    (!value.anchor_date || value.deadline_offset_days !== 0)
  )
    invalid(
      "Una obligación única exige fecha límite explícita y desplazamiento cero.",
    );
  if (
    (value.frequency === "eventual") !==
    value.applicability_conditions.event_types.length > 0
  )
    invalid("Configura los eventos de la frecuencia eventual.");
  if (
    value.applicability_conditions.termination_reasons.length &&
    value.applicability_conditions.employment_stage !== "cese"
  )
    invalid("Los motivos de cese requieren la etapa de cese.");
  if (
    ["ingreso", "cese"].includes(
      value.applicability_conditions.employment_stage,
    ) &&
    (value.module !== "laboral_trabajador" || value.frequency !== "eventual")
  )
    invalid(
      "Ingreso y cese requieren destino laboral por trabajador y frecuencia eventual.",
    );
  const codes = value.deliverable_specs.map((slot) => slot.position_code);
  const orders = value.deliverable_specs.map((slot) => slot.display_order);
  if (
    new Set(codes).size !== codes.length ||
    new Set(orders).size !== orders.length
  )
    invalid("Cada posición debe tener un código y orden únicos.");
  if (
    value.deliverable_specs.some(
      (slot) =>
        slot.max_file_bytes > value.max_file_bytes ||
        slot.allowed_formats.some(
          (format) => !value.allowed_formats.includes(format),
        ),
    )
  )
    invalid("Los archivos deben respetar los formatos y límites generales.");
}
