import { describe, expect, it } from "vitest";

import {
  parseActivityFilters,
  serializeActivityFilters,
} from "../src/domain/activities/utils/activity-filters";
import {
  digestItemSchema,
  externalDigestSchema,
  whatsappBatchSchema,
  whatsappReceiptSchema,
} from "../src/domain/integrations/contracts/whatsapp.schema";
import { canRetryWebhook } from "../src/domain/integrations/utils/webhook-retry";
import { safeReturnTo } from "../src/features/auth/utils/safe-return-to";

const id = "50000000-0000-4000-8000-000000000001";
const item = {
  obligation_id: id,
  notification_event_id: null,
  category: "overdue",
  title: "Entrega requerida",
  company: null,
  module: "actividades",
  due_date: "2026-10-16",
  priority: "alta",
  url: `https://app.example.test/actividades/${id}`,
};
const digest = {
  delivery_id: id,
  recipient_id: id,
  local_date: "2026-10-16",
  phone: "+51999999006",
  items: [item],
};
const receipt = {
  schema_version: "1.0",
  receipt_id: id,
  delivery_id: id,
  status: "delivered",
  occurred_at: "2026-10-16T09:00:00-05:00",
  provider_message_id: "provider-test-1",
};
describe("H06 activity context", () => {
  it("discards unsupported query values and private keys", () => {
    const filters = parseActivityFilters(
      new URLSearchParams(
        "group=hacked&page=-1&pageSize=200&scope=external&module=other&dueFrom=2026-02-30&token=secret",
      ),
    );
    expect(filters).toMatchObject({
      group: "mine",
      page: 1,
      pageSize: 25,
      scope: "all",
      module: undefined,
      dueFrom: undefined,
    });
    expect(serializeActivityFilters(filters)).not.toContain("token");
  });
  it("preserves a full inbox context and page size through safe return", () => {
    const filters = parseActivityFilters(
      new URLSearchParams(
        `group=review&page=2&pageSize=100&scope=company&companyId=${id}&priority=alta&dueFrom=2026-10-01&sort=received`,
      ),
    );
    const route = `/actividades?${serializeActivityFilters(filters)}`;
    expect(safeReturnTo(route)).toBe(route);
    expect(
      parseActivityFilters(
        new URLSearchParams(serializeActivityFilters(filters)),
      ),
    ).toEqual(filters);
  });
  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/api/integrations/n8n/receipts",
  ])("rejects untrusted return %s", (value) =>
    expect(safeReturnTo(value)).toBe("/dashboard"),
  );
  it("removes signed URL tokens from notification return", () =>
    expect(
      safeReturnTo("/notificaciones?unread=true&page=2&token=secret"),
    ).toBe("/notificaciones?unread=true&page=2"));
});
describe("H06 external privacy contracts", () => {
  it("accepts an internal activity with a canonical app URL", () =>
    expect(digestItemSchema.safeParse(item).success).toBe(true));
  it.each(["?token=secret", "#secret", "/", "?download=1"])(
    "rejects noncanonical suffix %s",
    (suffix) =>
      expect(
        digestItemSchema.safeParse({ ...item, url: item.url + suffix }).success,
      ).toBe(false),
  );
  it("rejects URL credentials", () =>
    expect(
      digestItemSchema.safeParse({
        ...item,
        url: item.url.replace("https://", "https://user:secret@"),
      }).success,
    ).toBe(false));
  it.each([
    "salary",
    "diagnosis",
    "observation_details",
    "signed_url",
    "files",
  ])("rejects private field %s", (key) =>
    expect(
      digestItemSchema.safeParse({ ...item, [key]: "private" }).success,
    ).toBe(false),
  );
  it("requires a stable observation event", () =>
    expect(
      digestItemSchema.safeParse({ ...item, category: "observed" }).success,
    ).toBe(false));
  it("rejects empty digests and noninternational numbers", () => {
    expect(
      externalDigestSchema.safeParse({ ...digest, items: [] }).success,
    ).toBe(false);
    expect(
      externalDigestSchema.safeParse({ ...digest, phone: "999999006" }).success,
    ).toBe(false);
  });
  it("enforces a maximum of 50 nonempty digests", () => {
    const batch = {
      schema_version: "1.0",
      batch_id: id,
      event_type: "whatsapp.digest.batch",
      generated_at: receipt.occurred_at,
      timezone: "America/Lima",
      digests: [digest],
    };
    expect(whatsappBatchSchema.safeParse(batch).success).toBe(true);
    expect(
      whatsappBatchSchema.safeParse({
        ...batch,
        digests: Array(51).fill(digest),
      }).success,
    ).toBe(false);
  });
  it("requires provider evidence for sent and delivered", () => {
    expect(whatsappReceiptSchema.safeParse(receipt).success).toBe(true);
    expect(
      whatsappReceiptSchema.safeParse({ ...receipt, provider_message_id: null })
        .success,
    ).toBe(false);
    expect(
      whatsappReceiptSchema.safeParse({
        ...receipt,
        status: "unknown",
        provider_message_id: null,
      }).success,
    ).toBe(true);
  });
  it.each([400, 401, 403, 422])("does not retry HTTP %s", (httpStatus) =>
    expect(
      canRetryWebhook({ httpStatus, accepted: false, outcome: "responded" }),
    ).toBe(false),
  );
  it.each([null, 429, 500, 503])(
    "retries an ambiguous or temporary HTTP %s",
    (httpStatus) =>
      expect(
        canRetryWebhook({ httpStatus, accepted: false, outcome: "responded" }),
      ).toBe(true),
  );
  it("never retries acknowledged delivery", () =>
    expect(
      canRetryWebhook({
        httpStatus: 200,
        accepted: true,
        outcome: "responded",
      }),
    ).toBe(false));
});
