import { describe, expect, it } from "vitest";

import {
  employmentInputSchema,
  workerInputSchema,
} from "../src/domain/workers/contracts/worker.schema";

const worker = {
  company_id: "50000000-0000-4000-8000-000000000001",
  identity_type: "DNI",
  identity_number: "00123456",
  first_names: "Nombre",
  last_names: "Apellidos",
  birth_date: null,
  email: null,
  phone: null,
  address: null,
  notes: null,
};
const employment = {
  start_date: "2026-10-01",
  end_date: null,
  termination_reason: null,
  termination_notes: null,
  position: null,
  department: null,
  contract_type: null,
  reference_salary: "1234.50",
  currency: "PEN",
};
describe("employment input contracts", () => {
  it("preserves leading zeros and normalizes identity whitespace", () => {
    expect(
      workerInputSchema.parse({ ...worker, identity_number: " 00123456 " })
        .identity_number,
    ).toBe("00123456");
  });
  it.each(["1234567", "123456789", "ABC12345"])(
    "rejects invalid DNI %s",
    (identity) => {
      expect(
        workerInputSchema.safeParse({ ...worker, identity_number: identity })
          .success,
      ).toBe(false);
    },
  );
  it("normalizes foreign identity text without converting to a number", () => {
    expect(
      workerInputSchema.parse({
        ...worker,
        identity_type: "CE",
        identity_number: " ab 123 ",
      }).identity_number,
    ).toBe("AB123");
  });
  it("keeps salary as an exact decimal string", () => {
    expect(employmentInputSchema.parse(employment).reference_salary).toBe(
      "1234.50",
    );
    expect(
      employmentInputSchema.parse({
        ...employment,
        reference_salary: "999999999999.99",
      }).reference_salary,
    ).toBe("999999999999.99");
  });
  it.each(["-1.00", "1.001", "1,20", "1e3", "1000000000000.00"])(
    "rejects unsupported monetary input %s",
    (amount) => {
      expect(
        employmentInputSchema.safeParse({
          ...employment,
          reference_salary: amount,
        }).success,
      ).toBe(false);
    },
  );
  it("requires cese date and reason together", () => {
    expect(
      employmentInputSchema.safeParse({ ...employment, end_date: "2026-10-10" })
        .success,
    ).toBe(false);
    expect(
      employmentInputSchema.safeParse({
        ...employment,
        termination_reason: "renuncia",
      }).success,
    ).toBe(false);
  });
  it("requires an observation for another cese reason", () => {
    expect(
      employmentInputSchema.safeParse({
        ...employment,
        end_date: "2026-10-10",
        termination_reason: "otro",
      }).success,
    ).toBe(false);
    expect(
      employmentInputSchema.safeParse({
        ...employment,
        end_date: "2026-10-10",
        termination_reason: "otro",
        termination_notes: "Motivo documentado",
      }).success,
    ).toBe(true);
  });
  it("rejects a cese before the hire date", () => {
    expect(
      employmentInputSchema.safeParse({
        ...employment,
        end_date: "2026-09-30",
        termination_reason: "renuncia",
      }).success,
    ).toBe(false);
  });
});
