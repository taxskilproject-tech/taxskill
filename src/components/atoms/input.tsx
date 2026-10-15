import { FOCUS_RING } from "@/components/constants/control-styles";
import type { InputProps } from "@/components/types/control.types";

export function Input({ className = "", invalid, ...props }: InputProps) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={`min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-base text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-100 ${invalid ? "border-red-500" : "border-zinc-300"} ${FOCUS_RING} ${className}`}
    />
  );
}
