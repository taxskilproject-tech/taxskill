import type { BadgeProps } from "@/components/types/control.types";

export function Badge({ children }: BadgeProps) {
  return (
    <span className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-700">
      {children}
    </span>
  );
}
