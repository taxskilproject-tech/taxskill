import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";

import { OperationsStatus } from "@/features/operations/components/operations-status";

import { healthyOperations } from "./fixtures/operations";

it("muestra fallos de automatización aunque Cron haya terminado correctamente", () => {
  const snapshot = { ...healthyOperations(), automation_failures: 2 };
  const html = renderToStaticMarkup(<OperationsStatus snapshot={snapshot} />);
  expect(html).toContain('role="alert"');
  expect(html).toContain("Hay un fallo de automatización");
  expect(html).toContain("Fallos de automatización");
  expect(html).not.toContain("Sin incidencias en los controles");
});
it("anuncia falta de avance documental, de avisos y de preparación", () => {
  const snapshot = {
    ...healthyOperations(),
    generation_pending_since: "2026-10-19T10:00:00Z",
    deadline_pending_since: "2026-10-19T10:00:00Z",
    digest_pending_since: "2026-10-19T10:00:00Z",
  };
  const html = renderToStaticMarkup(<OperationsStatus snapshot={snapshot} />);
  expect(html).toContain("La generación documental no avanza");
  expect(html).toContain("El barrido de avisos no avanza");
  expect(html).toContain("La preparación de resúmenes no avanza");
  expect(html).toContain("Pendiente desde:");
});
it("avisa de jobs ausentes aunque el cleanup esté sano", () => {
  const snapshot = healthyOperations();
  snapshot.jobs = snapshot.jobs.filter(
    (job) => job.name === "h03-staging-cleanup",
  );
  const html = renderToStaticMarkup(<OperationsStatus snapshot={snapshot} />);
    expect(html).toContain("El proceso «Generación documental» no está configurado");
    expect(html).toContain("El proceso «Avisos y resumen diario» no está configurado");
});
it("distingue prepublicación explícita sin cambiar la programación ni ocultar fallos", () => {
  const snapshot = healthyOperations();
  snapshot.jobs = snapshot.jobs.filter(
    (job) => job.name === "h03-staging-cleanup",
  );
  const paused = renderToStaticMarkup(
    <OperationsStatus mode="prepublication" snapshot={snapshot} />,
  );
  expect(paused).toContain("Prepublicación declarada");
  expect(paused).toContain("ni cambia la programación");
  expect(paused).not.toContain('role="alert"');
  expect(
    renderToStaticMarkup(
      <OperationsStatus
        mode="prepublication"
        snapshot={{ ...snapshot, automation_failures: 1 }}
      />,
    ),
  ).toContain('role="alert"');
});
