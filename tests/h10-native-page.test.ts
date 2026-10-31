import { expect, it } from "vitest";

import { runMonthlyMailboxQuery } from "../scripts/sunat-pilot/worker/services/run-monthly-query";
import { parseNativePage } from "../scripts/sunat-worker/utils/native-page";

function pagePayload(count = 25, total = 25, page = 1) {
  const start = (page - 1) * 25 + 1;
  return {
    page,
    startPage: start,
    endPage: Math.min(page * 25, total),
    records: total,
    total: Math.ceil(total / 25),
    rows: Array.from({ length: count }, (_, index) => ({
      codMensaje: start + index,
      desAsunto: "Documento sintético",
      fecPublica: "15/10/2026 10:30:00",
      indEstado: 1,
      indTipmsj: 2,
      cantidadArchAdj: index === 0 ? 1 : 0,
    })),
  };
}

function queryInput() {
  return {
    connection_key: "synthetic",
    mailbox: "notifications",
    from: "2026-10-01",
    through: "2026-10-31",
    read_effect_consent: {
      accepted: true,
      warning_version: 1,
      accepted_at: new Date().toISOString(),
    },
    limits: {
      max_pages: 10,
      max_requests: 20,
      max_duration_ms: 45000,
      max_attempts_per_page: 2,
      request_timeout_ms: 15000,
    },
  };
}

it("normaliza una página vacía coherente y rechaza un falso vacío con filas", () => {
  const empty = { ...pagePayload(0, 0), page: null, total: 1, startPage: 0 };
  const mapped = parseNativePage(empty, "synthetic", "notifications");
  expect(mapped.items).toEqual([]);
  expect(mapped.start).toBe(1);
  expect(mapped.end).toBe(0);
  expect(() =>
    parseNativePage(
      { ...empty, rows: pagePayload(1).rows },
      "synthetic",
      "notifications",
    ),
  ).toThrow("PAGE_INCONSISTENT");
});

it("obtiene el número de página del rango cuando SUNAT devuelve page nulo", () => {
  const payload = { ...pagePayload(15, 40, 2), page: null };
  expect(parseNativePage(payload, "synthetic", "notifications").page).toBe(2);
});

it("toma fecha, lectura y adjuntos de los campos del origen y conserva IDs", () => {
  const mapped = parseNativePage(pagePayload(), "synthetic", "notifications");
  expect(mapped.items[0]).toEqual({
    id: "1",
    published_on: "2026-10-15",
    read: true,
    has_attachments: true,
  });
  expect(mapped.items[1].has_attachments).toBe(false);
  expect(mapped.order).toBe("unverified");
});

it("conserva ceros iniciales de identificadores recibidos como texto", () => {
  const payload = pagePayload(1, 1);
  const input = {
    ...payload,
    rows: [{ ...payload.rows[0], codMensaje: "000042" }],
  };
  expect(parseNativePage(input, "synthetic", "notifications").items[0].id).toBe(
    "000042",
  );
});

it("rechaza bandeja distinta, fecha inválida y cuerpo incompleto", () => {
  expect(() => parseNativePage(pagePayload(), "synthetic", "messages")).toThrow(
    "PAGE_INCONSISTENT",
  );
  expect(() => parseNativePage({}, "synthetic", "notifications")).toThrow(
    "UNEXPECTED_RESPONSE",
  );
  const payload = pagePayload();
  payload.rows[0].fecPublica = "31/02/2026";
  expect(() =>
    parseNativePage(payload, "synthetic", "notifications"),
  ).toThrow();
});

it("reproduce 24 filas de 40 informadas sin certificar un mes completo", async () => {
  const result = await runMonthlyMailboxQuery(queryInput(), {
    transport: {
      readPage: async () =>
        parseNativePage(pagePayload(24, 40), "synthetic", "notifications"),
      renewSession: async () => undefined,
    },
    checkpoints: { load: async () => null, save: async () => undefined },
  });
  expect(result.reason).toBe("PAGE_INCONSISTENT");
  expect(result.status).toBe("partial");
  expect(result.last_success_may_advance).toBe(false);
});

it("rechaza página final vacía y conserva únicamente la primera página válida", async () => {
  const result = await runMonthlyMailboxQuery(queryInput(), {
    transport: {
      readPage: async ({ page }) =>
        parseNativePage(
          pagePayload(page === 1 ? 25 : 0, 40, page),
          "synthetic",
          "notifications",
        ),
      renewSession: async () => undefined,
    },
    checkpoints: { load: async () => null, save: async () => undefined },
  });
  expect(result.reason).toBe("PAGE_INCONSISTENT");
  expect(result.checkpoint.items).toHaveLength(25);
  expect(result.last_success_may_advance).toBe(false);
});

it("completa páginas válidas sin duplicar ni alterar sus conteos", async () => {
  const result = await runMonthlyMailboxQuery(queryInput(), {
    transport: {
      readPage: async ({ page }) =>
        parseNativePage(
          pagePayload(page === 1 ? 25 : 15, 40, page),
          "synthetic",
          "notifications",
        ),
      renewSession: async () => undefined,
    },
    checkpoints: { load: async () => null, save: async () => undefined },
  });
  expect(result.status).toBe("complete");
  expect(result.checkpoint.items).toHaveLength(40);
  expect(result.last_success_may_advance).toBe(true);
});
