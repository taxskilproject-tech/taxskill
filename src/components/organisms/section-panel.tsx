import type { SectionPanelProps } from "@/components/types/control.types";

export function SectionPanel({
  children,
  description,
  headingId,
  title,
}: SectionPanelProps) {
  return (
    <section
      aria-labelledby={headingId}
      className="grid content-start gap-5 rounded-xl border border-zinc-200 bg-white p-6 sm:p-8"
    >
      <div className="grid gap-2">
        <h2 className="text-lg font-semibold" id={headingId}>
          {title}
        </h2>
        <p className="text-sm leading-6 text-zinc-600">{description}</p>
      </div>
      {children}
    </section>
  );
}
