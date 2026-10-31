import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";

import { pilotRunInputSchema } from "../scripts/sunat-worker/contracts/pilot-run.schema";
import { pilotMonthWindow } from "../scripts/sunat-worker/utils/pilot-month";
import {
  encryptSunatCredentials,
  parseSunatKeyring,
} from "../src/features/sunat-mailbox/services/credentials-crypto.server";

function encryptedPilot() {
  const scope = {
    organization_id: randomUUID(),
    company_id: randomUUID(),
    connection_id: randomUUID(),
    credential_version: 1,
  };
  const keyring = parseSunatKeyring(
    "fixture",
    JSON.stringify({ fixture: "ab".repeat(32) }),
  );
  return {
    authorized: true,
    scope,
    encrypted: encryptSunatCredentials(
      { ruc: "20000000001", username: "fixture", password: "fixture-only" },
      scope,
      keyring,
    ),
  };
}

it("conserva los archivos cifrados del piloto anterior sin mezclar ámbitos", () => {
  const input = encryptedPilot();
  const parsed = pilotRunInputSchema.parse(input);
  expect(parsed.scope.connection_id).toBe(input.scope.connection_id);
  expect(parsed.pilot_reference).toBe("pilot-2");
  expect(parsed.months).toEqual(["2026-10", "2026-09"]);
});

it("admite otra referencia y periodos explícitos con un ámbito propio", () => {
  const input = encryptedPilot();
  const parsed = pilotRunInputSchema.parse({
    ...input,
    pilot_reference: "pilot-3",
    months: ["2026-02", "2025-12"],
  });
  expect(parsed.pilot_reference).toBe("pilot-3");
  expect(parsed.months).toEqual(["2026-02", "2025-12"]);
  expect(parsed.scope.connection_id).toBe(input.scope.connection_id);
});

it.each([
  { authorized: false },
  { password: "must-not-be-accepted" },
  { pilot_reference: "../other-company" },
  { months: ["2026-10", "2026-10"] },
  { months: ["2026-13", "2026-09"] },
  { months: ["2026-10"] },
])("rechaza entradas no autorizadas, sensibles o ambiguas: %j", (override) => {
  expect(
    pilotRunInputSchema.safeParse({ ...encryptedPilot(), ...override }).success,
  ).toBe(false);
});

it.each([
  ["2026-10", "2026-10-31"],
  ["2026-02", "2026-02-28"],
  ["2024-02", "2024-02-29"],
  ["2025-12", "2025-12-31"],
  ["0099-02", "0099-02-28"],
])(
  "calcula el cierre civil de %s sin depender del huso horario",
  (month, end) => {
    expect(pilotMonthWindow(month)).toEqual({
      from: month + "-01",
      through: end,
    });
  },
);

it.each(["2026-00", "2026-13", "2026-1", "2026-10-01", "today"])(
  "rechaza un periodo inválido antes de consultar SUNAT: %s",
  (month) => expect(() => pilotMonthWindow(month)).toThrow(),
);
