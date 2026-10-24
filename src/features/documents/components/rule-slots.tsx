"use client";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/atoms/button";
import { MAX_DELIVERABLES } from "@/domain/documents/constants/engine";
import { SlotFields } from "@/features/documents/components/slot-fields";
import type { RuleSlotsProps } from "@/features/documents/types/engine-ui.types";

export function RuleSlots({ maximum, slots }: RuleSlotsProps) {
  const [count, setCount] = useState(slots?.length ?? 2);
  const [selected, setSelected] = useState(1);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = root.current;
    const reveal = (event: Event) => {
      if (!(event.target instanceof Element)) return;
      const position = Number(
        event.target
          .closest("[data-form-slot]")
          ?.getAttribute("data-form-slot"),
      );
      if (position >= 1) setSelected(position);
    };
    element?.addEventListener("form-reveal", reveal);
    return () => element?.removeEventListener("form-reveal", reveal);
  }, []);
  return (
    <section className="space-y-4" ref={root}>
      <h3 className="font-medium">Archivos requeridos</h3>
      <input name="slot_count" type="hidden" value={count} />
      <p className="text-sm text-zinc-600">
        Cada posición se revisa individualmente. Todas deben aprobarse para
        completar la obligación.
      </p>
      <nav aria-label="Archivos requeridos" className="flex flex-wrap gap-1">
        {Array.from({ length: count }, (_, index) => (
          <Button
            key={index}
            aria-pressed={selected === index + 1}
            onClick={() => setSelected(index + 1)}
            variant={selected === index + 1 ? "primary" : "secondary"}
          >
            Archivo {index + 1}
          </Button>
        ))}
      </nav>
      <div>
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            data-form-slot={index + 1}
            hidden={selected !== index + 1}
          >
            <SlotFields
              key={index}
              maximum={maximum}
              position={index + 1}
              spec={slots?.[index]}
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={count >= MAX_DELIVERABLES}
          onClick={() => {
            setCount(count + 1);
            setSelected(count + 1);
          }}
          variant="secondary"
        >
          Agregar archivo
        </Button>
        <Button
          disabled={count <= 1}
          onClick={() => {
            setCount(count - 1);
            setSelected(Math.min(selected, count - 1));
          }}
          variant="secondary"
        >
          Quitar último archivo
        </Button>
      </div>
    </section>
  );
}
