import type { FilterDisclosureProps } from "@/components/types/layout.types";

export function FilterDisclosure({
  children,
  count = 0,
  label = "Filtros",
}: FilterDisclosureProps) {
  return (
    <details className="rounded-lg border border-zinc-200 bg-white px-3">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
        {label}
        <span className="text-xs text-zinc-500">
          {count ? `${count} activos` : "⌄"}
        </span>
      </summary>
      <div className="space-y-3 border-t border-zinc-100 py-3">{children}</div>
    </details>
  );
}
