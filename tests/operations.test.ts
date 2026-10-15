import { expect, it } from "vitest";

import {
  getOperationHttpStatus,
  normalizeOperationError,
} from "@/domain/common/utils/normalize-operation-error";
import { validateOperationMetadata } from "@/domain/common/utils/validate-operation-metadata";

it.each([
  ["23505", "CONFLICT"],
  ["40001", "CONFLICT"],
  ["42501", "FORBIDDEN"],
  ["PGRST301", "UNAUTHENTICATED"],
  ["PGRST116", "NOT_FOUND"],
  ["FILE_TOO_LARGE", "FILE_TOO_LARGE"],
])("traduce %s sin exponer mensajes del proveedor", (source, expected) => {
  const result = normalizeOperationError({
    code: source,
    message: "password=confidencial",
  });
  expect(result.code).toBe(expected);
  expect(JSON.stringify(result)).not.toContain("confidencial");
});

it("representa explícitamente fallos inesperados sin traza ni secretos", () => {
  const result = normalizeOperationError(new Error("token=privado"));
  expect(result.code).toBe("DEPENDENCY_UNAVAILABLE");
  expect(JSON.stringify(result)).not.toContain("privado");
  expect(getOperationHttpStatus("CONFLICT")).toBe(409);
});

it("valida identificador idempotente y revisión entera no negativa", () => {
  const request_id = "11111111-1111-4111-8111-111111111111";
  expect(
    validateOperationMetadata({ request_id, expected_revision: 0 }).ok,
  ).toBe(true);
  expect(
    validateOperationMetadata({ request_id, expected_revision: -1 }).ok,
  ).toBe(false);
  expect(
    validateOperationMetadata({ request_id, expected_revision: 1.5 }).ok,
  ).toBe(false);
  expect(validateOperationMetadata({ request_id: "otro" }).ok).toBe(false);
});
