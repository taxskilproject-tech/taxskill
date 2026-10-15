import type { PageHeadingProps } from "@/features/access/types/access-ui.types";

export function PageHeading({
  eyebrow = "Espacio de trabajo",
  title,
  description,
  action,
}: PageHeadingProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 pb-6">
      <div className="max-w-2xl space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm leading-6 text-zinc-600">{description}</p>
      </div>
      {action}
    </header>
  );
}
