"use client";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { MAX_DELIVERABLES } from "@/domain/documents/constants/engine";
import { SlotFields } from "@/features/documents/components/slot-fields";
import type { RuleSlotsProps } from "@/features/documents/types/engine-ui.types";

export function RuleSlots({ maximum, slots }: RuleSlotsProps) {
  const [count, setCount] = useState(slots?.length ?? 2);
  return (
    <section className="space-y-4">
      <h3 className="font-medium">Archivos requeridos</h3>
      <input name="slot_count" type="hidden" value={count} />
      <p className="text-sm text-zinc-600">
        Cada posición se revisa individualmente. Todas deben aprobarse para
        completar la obligación.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: count }, (_, index) => (
          <SlotFields
            key={index}
            maximum={maximum}
            position={index + 1}
            spec={slots?.[index]}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={count >= MAX_DELIVERABLES}
          onClick={() => setCount(count + 1)}
          variant="secondary"
        >
          Agregar archivo
        </Button>
        <Button
          disabled={count <= 1}
          onClick={() => setCount(count - 1)}
          variant="secondary"
        >
          Quitar último archivo
        </Button>
      </div>
    </section>
  );
}
