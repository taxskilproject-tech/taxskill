"use client";
import { useState } from "react";

import type {
  FormReference,
  FormStepController,
} from "@/features/access/types/form-steps.types";
import { invalidFormControl } from "@/features/access/utils/form-step-validation";

export function useFormSteps(
  form: FormReference,
  count: number,
): FormStepController {
  const [step, setStep] = useState(0);
  const [summary, setSummary] = useState<FormData | null>(null);
  function reveal(element: Element) {
    const owner = Number(
      element.closest("[data-form-step]")?.getAttribute("data-form-step") ?? 0,
    );
    setStep(owner);
    element.dispatchEvent(new CustomEvent("form-reveal", { bubbles: true }));
    requestAnimationFrame(() => {
      if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
      )
        element.reportValidity();
    });
  }
  function select(value: number) {
    if (value < 0 || value >= count) return;
    const invalid = invalidFormControl(
      form.current?.querySelector(`[data-form-step="${step}"]`) ?? null,
    );
    if (value > step && invalid) {
      reveal(invalid);
      return;
    }
    setStep(value);
    if (value === count - 1 && form.current)
      setSummary(new FormData(form.current));
    form.current
      ?.closest("dialog")
      ?.querySelector("h2")
      ?.scrollIntoView({ block: "nearest" });
  }
  function validate() {
    const invalid = invalidFormControl(form.current);
    if (invalid) {
      reveal(invalid);
      return false;
    }
    return true;
  }
  return {
    summary,
    step,
    next: () => select(step + 1),
    back: () => select(step - 1),
    select,
    validate,
  };
}
