import { expect, it, vi } from "vitest";

import { mailboxLabJob } from "../scripts/sunat-pilot/worker/lab/helpers";
import { MailboxError } from "../scripts/sunat-pilot/worker/services/mailbox-error";
import { runMonthlyMailboxQuery } from "../scripts/sunat-pilot/worker/services/run-monthly-query";
import type { MailboxPage } from "../scripts/sunat-pilot/worker/types/mailbox.types";
import { partialMailboxItems } from "../scripts/sunat-pilot/worker/utils/partial-page";

function incompletePage(): MailboxPage {
  return {
    connection_key: "local-fixture-company",
    mailbox: "messages",
    page: 1,
    page_size: 25,
    total: 54,
    start: 1,
    end: 25,
    order: "unverified",
    items: Array.from({ length: 17 }, (_, index) => ({
      id: "fixture-" + index,
      published_on: "2026-10-15",
      read: true,
      has_attachments: false,
    })),
  };
}

it("conserva las filas válidas sin aceptar la página ni avanzar el cursor", async () => {
  const job = mailboxLabJob({ mailbox: "messages" });
  const save = vi.fn();
  const partial = vi.fn();
  const result = await runMonthlyMailboxQuery(job, {
    transport: {
      readPage: async () => ({ ...incompletePage(), total: 25 }),
      renewSession: async () => undefined,
    },
    checkpoints: { load: async () => null, save, savePartial: partial },
  });
  expect(result.status).toBe("partial");
  expect(result.reason).toBe("PAGE_INCONSISTENT");
  expect(result.last_success_may_advance).toBe(false);
  expect(result.checkpoint.next_page).toBe(1);
  expect(result.checkpoint.complete).toBe(false);
  expect(result.checkpoint.items).toHaveLength(0);
  expect(result.metrics.pages_accepted).toBe(0);
  expect(save).not.toHaveBeenCalled();
  expect(partial).toHaveBeenCalledTimes(job.limits.max_attempts_per_page);
  expect(partial.mock.calls[0][1]).toHaveLength(17);
  expect(partial.mock.calls[0][2].complete).toBe(false);
});

it("persiste solo los registros del periodo pedido", () => {
  const page = incompletePage();
  page.items[0] = { ...page.items[0], published_on: "2025-10-15" };
  const job = mailboxLabJob({ mailbox: "messages" });
  expect(partialMailboxItems(page, 1, job)).toHaveLength(16);
});

it("rechaza otra empresa, bandeja o página y deduplica filas de la bandeja verificada", () => {
  const job = mailboxLabJob({ mailbox: "messages" });
  const page = incompletePage();
  expect(
    partialMailboxItems({ ...page, connection_key: "other" }, 1, job),
  ).toEqual([]);
  expect(
    partialMailboxItems({ ...page, mailbox: "notifications" }, 1, job),
  ).toEqual([]);
  expect(partialMailboxItems(page, 2, job)).toEqual([]);
  expect(
    partialMailboxItems(
      { ...page, items: [page.items[0], page.items[0]] },
      1,
      job,
    ),
  ).toEqual([page.items[0]]);
});

it("recupera páginas posteriores sin certificar la primera página incompleta", async () => {
  const gap = incompletePage();
  const tail = {
    ...gap,
    page: 2,
    start: 26,
    end: 27,
    total: 27,
    items: gap.items
      .slice(0, 2)
      .map((item) => ({ ...item, id: item.id + "-tail" })),
  };
  const readPage = vi.fn(async ({ page }: { page: number }) =>
    page === 1 ? { ...gap, total: 27 } : tail,
  );
  const savePartial = vi.fn();
  const onPageFailure = vi.fn();
  const result = await runMonthlyMailboxQuery(
    mailboxLabJob({ mailbox: "messages" }),
    {
      transport: { readPage, renewSession: async () => undefined },
      checkpoints: { load: async () => null, save: vi.fn(), savePartial },
      onPageFailure,
    },
  );
  expect(savePartial.mock.lastCall?.[1]).toEqual(tail.items);
  expect(onPageFailure).toHaveBeenCalledWith(
    expect.objectContaining({
      mailbox: "messages",
      page: 1,
      attempt: 1,
      validation: expect.objectContaining({
        rule: "range_or_count",
        counts: { start: 1, end: 25, expected: 25, received: 17, total: 27 },
      }),
    }),
  );
  expect(result.reason).toBe("PAGE_INCONSISTENT");
  expect(result.checkpoint.next_page).toBe(1);
  expect(result.last_success_may_advance).toBe(false);
});

it("no persiste una página de otra empresa aunque contenga filas válidas", async () => {
  const partial = vi.fn();
  const result = await runMonthlyMailboxQuery(
    mailboxLabJob({ mailbox: "messages" }),
    {
      transport: {
        readPage: async () => ({
          ...incompletePage(),
          connection_key: "other-company",
        }),
        renewSession: async () => undefined,
      },
      checkpoints: {
        load: async () => null,
        save: vi.fn(),
        savePartial: partial,
      },
    },
  );
  expect(partial).not.toHaveBeenCalled();
  expect(result.reason).toBe("UNEXPECTED_RESPONSE");
});

it("un contrato inválido no produce registros recuperados", async () => {
  const partial = vi.fn();
  const page = incompletePage();
  const result = await runMonthlyMailboxQuery(
    mailboxLabJob({ mailbox: "messages" }),
    {
      transport: {
        readPage: async () => ({
          ...page,
          items: [{ ...page.items[0], published_on: "invalid" }],
        }),
        renewSession: async () => undefined,
      },
      checkpoints: {
        load: async () => null,
        save: vi.fn(),
        savePartial: partial,
      },
    },
  );
  expect(partial).not.toHaveBeenCalled();
  expect(result.reason).toBe("UNEXPECTED_RESPONSE");
});

it("informa el fallo de persistencia y no lo presenta como página guardada", async () => {
  const result = await runMonthlyMailboxQuery(
    mailboxLabJob({ mailbox: "messages" }),
    {
      transport: {
        readPage: async () => incompletePage(),
        renewSession: async () => undefined,
      },
      checkpoints: {
        load: async () => null,
        save: vi.fn(),
        savePartial: async () => {
          throw new MailboxError("CHECKPOINT_STORE_FAILED");
        },
      },
    },
  );
  expect(result.reason).toBe("CHECKPOINT_STORE_FAILED");
  expect(result.last_success_may_advance).toBe(false);
  expect(result.checkpoint.next_page).toBe(1);
});
