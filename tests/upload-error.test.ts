import { expect, it } from "vitest";

import { normalizeUploadError } from "@/features/documents/utils/upload-error";
it("reports an incompatible provider limit without weakening the snapshot", () => {
  const error = normalizeUploadError({
    originalResponse: { getStatus: () => 413 },
  });
  expect(error.code).toBe("STORAGE_LIMIT_INCOMPATIBLE");
  expect(error.message).toContain("condiciones históricas");
});
it("keeps concurrent storage conflicts explicit", () =>
  expect(
    normalizeUploadError({ originalResponse: { getStatus: () => 409 } }).code,
  ).toBe("CONFLICT"));
