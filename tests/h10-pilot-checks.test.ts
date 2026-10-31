import { expect, it, vi } from "vitest";

import type {
  MailboxKind,
  MailboxPage,
} from "../scripts/sunat-pilot/worker/types/mailbox.types";
import {
  verifyReadEffect,
  verifySessionRenewal,
} from "../scripts/sunat-worker/services/pilot-checks";
import { OfficialSunatSource } from "../scripts/sunat-worker/source/sunat-source";

function syntheticPage(
  mailbox: MailboxKind,
  read: boolean,
  month: string,
): MailboxPage {
  return {
    connection_key: "fixture",
    mailbox,
    page: 1,
    page_size: 25,
    start: 1,
    end: 1,
    total: 1,
    order: "unverified",
    items: [
      {
        id: "fixture-1",
        published_on: month + "-15",
        read,
        has_attachments: false,
      },
    ],
  };
}

it("comprueba la lectura en Mensajes cuando Notificaciones no tiene referencia", async () => {
  const source = new OfficialSunatSource();
  let opened = false;
  vi.spyOn(source, "readPage").mockImplementation(async ({ mailbox }) =>
    syntheticPage(mailbox, mailbox === "notifications" || opened, "2026-10"),
  );
  const details = vi.spyOn(source, "details").mockImplementation(async () => {
    opened = true;
    return { text: "Fixture", attachments: [], source_marked_read: true };
  });
  expect(
    await verifyReadEffect(source, ["2026-10", "2026-09"], "fixture"),
  ).toMatchObject({ status: "read_changed", mailbox: "messages" });
  expect(details).toHaveBeenCalledExactlyOnceWith("messages", "fixture-1");
});

it("no abre registros de meses no autorizados para demostrar lectura", async () => {
  const source = new OfficialSunatSource();
  vi.spyOn(source, "readPage").mockImplementation(async ({ mailbox }) =>
    syntheticPage(mailbox, false, "2025-10"),
  );
  const details = vi.spyOn(source, "details");
  expect(
    await verifyReadEffect(source, ["2026-10", "2026-09"], "fixture"),
  ).toEqual({ status: "not_demonstrated", reason: "NO_UNREAD_REFERENCE" });
  expect(details).not.toHaveBeenCalled();
});

it("distingue una lectura inalterada declarada por SUNAT de una prueba sin evidencia", async () => {
  const source = new OfficialSunatSource();
  vi.spyOn(source, "readPage").mockImplementation(async ({ mailbox }) =>
    syntheticPage(mailbox, mailbox === "notifications", "2026-10"),
  );
  vi.spyOn(source, "details").mockResolvedValue({
    text: "Fixture",
    attachments: [],
    source_marked_read: false,
  });
  expect(
    await verifyReadEffect(source, ["2026-10", "2026-09"], "fixture"),
  ).toMatchObject({
    status: "observed_unchanged",
    mailbox: "messages",
    source_reported_update: false,
    reason: null,
  });
});

it("dos listados vacíos no demuestran estabilidad de identificadores", async () => {
  const source = new OfficialSunatSource();
  const empty = {
    ...syntheticPage("notifications", true, "2026-10"),
    total: 0,
    end: 0,
    items: [],
  };
  vi.spyOn(source, "renewSession").mockResolvedValue();
  vi.spyOn(source, "readPage").mockResolvedValue(empty);
  expect(await verifySessionRenewal(source, empty, "fixture")).toEqual({
    renewed: true,
    stable_ids_after_renewal: false,
  });
});

it("renueva la sesión y contrasta los IDs de la misma bandeja", async () => {
  const source = new OfficialSunatSource();
  const page = syntheticPage("messages", true, "2026-10");
  const renewal = vi.spyOn(source, "renewSession").mockResolvedValue();
  const reading = vi.spyOn(source, "readPage").mockResolvedValue(page);
  expect(await verifySessionRenewal(source, page, "fixture")).toEqual({
    renewed: true,
    stable_ids_after_renewal: true,
  });
  expect(renewal).toHaveBeenCalledOnce();
  expect(reading.mock.calls[0][0].mailbox).toBe("messages");
});
