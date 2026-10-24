import { DOCUMENT_MODULES } from "@/domain/common/constants/modules";

export function ModuleOverview() {
  return (
    <section aria-labelledby="modulos-titulo" className="grid gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold" id="modulos-titulo">
          Módulos del producto
        </h2>
        <span className="text-sm text-zinc-600">
          Se implementarán en los siguientes hitos
        </span>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DOCUMENT_MODULES.map((module) => (
          <li
            className="grid content-start gap-2 rounded-xl border border-zinc-200 bg-white p-5"
            key={module.id}
          >
            <h3 className="font-medium">{module.name}</h3>
            <p className="text-sm leading-6 text-zinc-600">
              {module.description}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
