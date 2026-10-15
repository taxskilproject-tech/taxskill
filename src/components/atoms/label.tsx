import type { LabelProps } from "@/components/types/control.types";

export function Label({ className = "", ...props }: LabelProps) {
  return (
    <label
      {...props}
      className={`text-sm font-medium text-zinc-950 ${className}`}
    />
  );
}
