import type { WorkerFactsProps } from "@/features/workers/types/worker-ui.types";

export function WorkerFacts({ worker }: WorkerFactsProps) {
  return (
    <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="font-semibold">Ficha del trabajador</h2>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Identificación</dt>
          <dd className="mt-1">
            {worker.identity_type} {worker.identity_number}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Nacimiento</dt>
          <dd className="mt-1">{worker.birth_date ?? "Sin informar"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Correo</dt>
          <dd className="mt-1 break-words">{worker.email ?? "Sin informar"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Teléfono</dt>
          <dd className="mt-1">{worker.phone ?? "Sin informar"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Dirección</dt>
          <dd className="mt-1">{worker.address ?? "Sin informar"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Notas</dt>
          <dd className="mt-1 whitespace-pre-wrap">
            {worker.notes ?? "Sin notas"}
          </dd>
        </div>
      </dl>
      {worker.deleted_at && (
        <p className="text-sm text-zinc-700">
          Ficha eliminada lógicamente. Motivo: {worker.deletion_reason}. Las
          periodos laborales y documentos se conservan.
        </p>
      )}
    </section>
  );
}
