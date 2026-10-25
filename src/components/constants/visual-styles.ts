import type { VisualTone } from "@/components/types/visual.types";

export const TONE_STYLES: Record<VisualTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  blue: "border-blue-200 bg-blue-50 text-blue-800",
  violet: "border-violet-200 bg-violet-50 text-violet-800",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-800",
};

export const MODULE_TONES = {
  tributario: "blue",
  laboral_trabajador: "violet",
  laboral_general: "cyan",
} as const;
