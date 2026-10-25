import { TONE_STYLES } from "@/components/constants/visual-styles";
import type { BadgeProps } from "@/components/types/control.types";

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${TONE_STYLES[tone]}`}
    >
      {children}
    </span>
  );
}
