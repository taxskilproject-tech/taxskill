import type { PageHeadingProps } from "@/features/access/types/access-ui.types";

export function PageHeading({
  eyebrow = "Espacio de trabajo",
  title,
  description,
  action,
  showDescriptionOnMobile = false,
}: PageHeadingProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 max-w-2xl flex-1 space-y-1">
        <p className="sr-only">{eyebrow}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p
          className={
            action && !showDescriptionOnMobile
              ? "sr-only text-sm leading-5 text-zinc-600 sm:not-sr-only"
              : "text-sm leading-5 text-zinc-600"
          }
        >
          {description}
        </p>
      </div>
      {action}
    </header>
  );
}
