import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { fingerprintInput } from "@/features/users/services/fingerprint.server";

const key = "a".repeat(64);
it("la huella HMAC es canónica y depende de la contraseña y de la clave privada", () => {
  const first = fingerprintInput(
    {
      password: "Example-Only-22",
      grants: [{ module: "tributario", active: true }],
    },
    key,
  );
  expect(first).toMatch(/^[a-f0-9]{64}$/);
  expect(
    fingerprintInput(
      {
        grants: [{ active: true, module: "tributario" }],
        password: "Example-Only-22",
      },
      key,
    ),
  ).toBe(first);
  expect(
    fingerprintInput(
      {
        password: "Other-Example-22",
        grants: [{ module: "tributario", active: true }],
      },
      key,
    ),
  ).not.toBe(first);
  expect(
    fingerprintInput(
      {
        password: "Example-Only-22",
        grants: [{ module: "tributario", active: true }],
      },
      "b".repeat(64),
    ),
  ).not.toBe(first);
  expect(() => fingerprintInput({}, "missing")).toThrow(
    "DEPENDENCY_UNAVAILABLE",
  );
});
