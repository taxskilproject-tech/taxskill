import { ICON_PATHS } from "@/components/constants/icon-paths";
import type { IconProps } from "@/components/types/visual.types";

export function Icon({ name, className = "" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={`h-5 w-5 shrink-0 ${className}`}
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.7}
      viewBox="0 0 24 24"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
