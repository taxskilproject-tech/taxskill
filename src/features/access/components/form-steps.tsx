"use client";
import { Button } from "@/components/atoms/button";
import type { FormStepsProps } from "@/features/access/types/form-steps.types";

export function FormSteps({
  labels,
  step,
  onSelect,
  onNext,
  onBack,
  busy = false,
}: FormStepsProps) {
  return (
    <div className="sticky top-0 z-10 space-y-2 border-b border-zinc-200 bg-white py-3">
      <p className="text-sm font-medium" aria-live="polite">
        Paso {step + 1} de {labels.length} · {labels[step]}
      </p>
      <nav aria-label="Pasos del formulario" className="flex flex-wrap gap-1">
        {labels.map((label, index) => (
          <button
            aria-current={step === index ? "step" : undefined}
            aria-label={label}
            className={`min-h-11 min-w-11 rounded-lg px-3 text-sm focus-visible:outline-2 ${index === step ? "bg-blue-700 text-white" : "bg-zinc-100 text-zinc-700"}`}
            key={label}
            onClick={() => onSelect(index)}
            type="button"
            disabled={busy}
          >
            {index + 1}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          <Button
            disabled={busy || step === 0}
            onClick={onBack}
            variant="secondary"
          >
            Anterior paso
          </Button>
          {step < labels.length - 1 && (
            <Button disabled={busy} onClick={onNext}>
              Continuar
            </Button>
          )}
        </div>
      </nav>
    </div>
  );
}
