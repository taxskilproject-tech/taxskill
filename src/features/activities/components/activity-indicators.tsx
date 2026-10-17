import type { ActivityIndicatorsProps } from "@/features/activities/types/activity-ui.types";

export function ActivityIndicators({ indicators }: ActivityIndicatorsProps) {
  return (
    <section
      aria-label="Cumplimiento separado"
      className="grid gap-4 sm:grid-cols-2"
    >
      {Object.entries(indicators).map(([kind, counts]) => (
        <div
          className="rounded-xl border border-zinc-200 bg-white p-5"
          key={kind}
        >
          <h2 className="text-sm text-zinc-600">
            {kind === "documentary"
              ? "Cumplimiento documental"
              : "Actividades adicionales"}
          </h2>
          <p className="mt-2 text-xl font-semibold">
            {counts.required
              ? `${Math.round((counts.approved / counts.required) * 100)} %`
              : "Sin obligaciones"}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {counts.approved} / {counts.required} obligaciones exigibles
            aprobadas
          </p>
        </div>
      ))}
    </section>
  );
}
