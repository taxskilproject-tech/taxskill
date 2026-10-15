import { FOCUS_RING } from "@/components/constants/control-styles";
import type { SelectProps } from "@/components/types/control.types";

export function Select({ className = "", ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={`min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-60 ${FOCUS_RING} ${className}`}
    />
  );
}
