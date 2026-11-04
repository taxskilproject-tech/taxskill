import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";

import { SUNAT_ERROR_MESSAGES } from "@/domain/sunat/constants/sunat";
import type { SunatWorkspace } from "@/domain/sunat/types/sunat.types";
import { SunatConnectionStatus } from "@/features/sunat-mailbox/components/connection-status";

it("omite el aviso repetitivo de paginación y conserva otros errores de consulta", () => {
  const workspace: SunatWorkspace = {
    company: {
      id: "fixture",
      ruc: "20000000001",
      legal_name: "Empresa de prueba",
    },
    connection: null,
    jobs: [
      {
        id: "fixture-job",
        kind: "monthly",
        state: "partial",
        error_code: "PAGE_INCONSISTENT",
        created_at: "2026-11-03T12:00:00Z",
        finished_at: "2026-11-03T12:01:00Z",
        from_date: "2026-11-01",
        through_date: "2026-11-03",
        progress: { messages: 1 },
      },
    ],
    months: [],
    worker_ready: true,
    worker_mode: null,
  };
  const message = SUNAT_ERROR_MESSAGES.PAGE_INCONSISTENT;
  const html = renderToStaticMarkup(
    <SunatConnectionStatus workspace={workspace} actionError={message} />,
  );
  expect(html).not.toContain(message);
  expect(html).not.toContain('role="alert"');
  expect(html).toContain("Sin consulta completa registrada");
  const failed = renderToStaticMarkup(
    <SunatConnectionStatus
      workspace={workspace}
      actionError={SUNAT_ERROR_MESSAGES.SOURCE_UNAVAILABLE}
    />,
  );
  expect(failed).toContain('role="alert"');
});
