import type { RefObject } from "react";

export interface FormStepsProps {
  busy?: boolean;
  labels: readonly string[];
  step: number;
  onSelect: (value: number) => void;
  onNext: () => void;
  onBack: () => void;
}
export interface FormStepController {
  summary: FormData | null;
  step: number;
  next: () => void;
  back: () => void;
  select: (value: number) => void;
  validate: () => boolean;
}
export type FormReference = RefObject<HTMLFormElement | null>;
