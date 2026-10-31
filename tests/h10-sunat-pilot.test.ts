import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  sunatPilotEvidenceSchema,
  sunatPilotRequestSchema,
} from "../scripts/sunat-pilot/contracts/pilot.schema";
import { assessSunatPilot } from "../scripts/sunat-pilot/utils/evaluate-pilot";
import { sunatPilotMonths } from "../scripts/sunat-pilot/utils/pilot-months";
import {
  sunatPilotEvidenceFixture,
  sunatPilotFailedSessionFixture,
  sunatPilotMissingReferencesFixture,
  sunatPilotRequestFixture,
} from "./fixtures/sunat-pilot";

const NOW = new Date("2026-10-26T05:30:00Z");

describe("H10: puerta de factibilidad SUNAT", () => {
  it("los ejemplos iniciales nunca acreditan una conexión real", () => {
    const request = sunatPilotRequestSchema.parse(
      JSON.parse(
        readFileSync("integrations/sunat/pilot-request.example.json", "utf8"),
      ),
    );
    const evidence = sunatPilotEvidenceSchema.parse(
      JSON.parse(
        readFileSync("integrations/sunat/pilot-evidence.example.json", "utf8"),
      ),
    );
    const result = assessSunatPilot(request, evidence, NOW);
    expect(result.status).toBe("awaiting_administrator");
    expect(result.incomplete_checks).toHaveLength(8);
    expect(result.network_requests_performed).toBe(false);
  });

  it("ocho resultados simulados aprobados no permiten continuar", () => {
    const report = assessSunatPilot(
      sunatPilotRequestFixture(),
      sunatPilotEvidenceFixture(),
      NOW,
    );
    expect(report.status).toBe("awaiting_live_evidence");
  });

  it("un acceso real por navegador no prueba el funcionamiento del worker", () => {
    const evidence = sunatPilotEvidenceSchema.parse({
      ...sunatPilotEvidenceFixture(),
      provenance: "authorized_live",
      environment: "authorized_browser",
    });
    const report = assessSunatPilot(sunatPilotRequestFixture(), evidence, NOW);
    expect(report.status).toBe("pilot_incomplete");
    expect(report.technical_blockers).toContain("own_worker_not_validated");
  });

  it("incluso un expediente completo exige revisar sus evidencias humanas", () => {
    const evidence = sunatPilotEvidenceSchema.parse({
      ...sunatPilotEvidenceFixture(),
      provenance: "authorized_live",
    });
    const report = assessSunatPilot(sunatPilotRequestFixture(), evidence, NOW);
    expect(report.status).toBe("ready_for_implementation_review");
    expect(report.requires_human_evidence_review).toBe(true);
    expect(report.production_prerequisites).toEqual([
      "private_worker_capacity",
      "company_mapping",
    ]);
  });

  it("rechaza observaciones vinculadas a otra autorización", () => {
    const evidence = sunatPilotEvidenceSchema.parse({
      ...sunatPilotEvidenceFixture(),
      provenance: "authorized_live",
      authorization_reference: "another-authorization",
    });
    expect(
      assessSunatPilot(sunatPilotRequestFixture(), evidence, NOW)
        .technical_blockers,
    ).toContain("authorization_mismatch");
  });

  it("un fallo real mantiene cerrado el hito", () => {
    const report = assessSunatPilot(
      sunatPilotRequestFixture(),
      sunatPilotFailedSessionFixture(),
      NOW,
    );
    expect(report.status).toBe("pilot_failed");
    expect(report.failed_checks).toContain("session_recovery_and_errors");
  });

  it("la ausencia de mediciones y presupuestos no se sustituye por cero", () => {
    const evidence = sunatPilotEvidenceFixture();
    const report = assessSunatPilot(
      sunatPilotRequestFixture(),
      {
        ...evidence,
        provenance: "authorized_live",
        limits: { ...evidence.limits, max_requests: null },
      },
      NOW,
    );
    expect(report.status).toBe("pilot_incomplete");
    expect(report.technical_blockers).toContain("requests_not_measured");
  });

  it("el consumo por encima del presupuesto impide aprobar", () => {
    const evidence = sunatPilotEvidenceFixture();
    const report = assessSunatPilot(
      sunatPilotRequestFixture(),
      {
        ...evidence,
        provenance: "authorized_live",
        measurements: { ...evidence.measurements, request_count: 11 },
      },
      NOW,
    );
    expect(report.technical_blockers).toContain("requests_over_budget");
  });

  it("no acepta cambios de lectura no autorizados", () => {
    const evidence = sunatPilotEvidenceFixture();
    const report = assessSunatPilot(
      sunatPilotRequestFixture(),
      {
        ...evidence,
        provenance: "authorized_live",
        behavior: { ...evidence.behavior, read_state: "changes_on_access" },
      },
      NOW,
    );
    expect(report.status).toBe("pilot_incomplete");
    expect(report.technical_blockers).toContain(
      "read_state_change_not_authorized",
    );
  });

  it("no publica datos de empresa, operador ni referencias privadas", () => {
    const request = sunatPilotRequestFixture();
    const serialized = JSON.stringify(
      assessSunatPilot(request, sunatPilotEvidenceFixture(), NOW),
    );
    expect(serialized).not.toContain(request.company.ruc);
    expect(serialized).not.toContain(request.company.legal_name);
    expect(serialized).not.toContain(request.authorization.approved_by);
    expect(serialized).not.toContain(request.authorization.reference);
  });

  it("rechaza claves introducidas accidentalmente en los JSON", () => {
    const request = sunatPilotRequestFixture();
    expect(
      sunatPilotRequestSchema.safeParse({
        ...request,
        password: "fixture-only",
      }).success,
    ).toBe(false);
    expect(
      sunatPilotRequestSchema.safeParse({
        ...request,
        access: { ...request.access, clave_sol: "fixture-only" },
      }).success,
    ).toBe(false);
  });

  it("exige ocho comprobaciones diferentes y referencias para los resultados", () => {
    const evidence = sunatPilotEvidenceFixture();
    expect(
      sunatPilotEvidenceSchema.safeParse({
        ...evidence,
        checks: Array(8).fill(evidence.checks[0]),
      }).success,
    ).toBe(false);
    expect(
      sunatPilotEvidenceSchema.safeParse(sunatPilotMissingReferencesFixture())
        .success,
    ).toBe(false);
  });

  it("no acepta evidencias de un entorno productivo ni URLs como referencia", () => {
    const evidence = sunatPilotEvidenceFixture();
    expect(
      sunatPilotEvidenceSchema.safeParse({ ...evidence, environment: "cloud" })
        .success,
    ).toBe(false);
    expect(
      sunatPilotEvidenceSchema.safeParse({
        ...evidence,
        authorization_reference: "https://example.test/?token=fixture",
      }).success,
    ).toBe(false);
  });

  it("valida el mes vigente y una referencia anterior", () => {
    const request = sunatPilotRequestFixture();
    const report = assessSunatPilot(
      { ...request, months: { current: "2026-11", previous: "2026-12" } },
      sunatPilotEvidenceFixture(),
      NOW,
    );
    expect(report.missing_requirements).toContain("current_month");
    expect(report.missing_requirements).toContain("known_previous_month");
  });

  it("no acepta autorizaciones futuras ni permisos incompletos", () => {
    const request = sunatPilotRequestFixture();
    const report = assessSunatPilot(
      {
        ...request,
        authorization: {
          ...request.authorization,
          approved_at: "2026-11-01T00:00:00Z",
          allow_download: false,
        },
      },
      sunatPilotEvidenceFixture(),
      NOW,
    );
    expect(report.missing_requirements).toContain("explicit_authorization");
  });

  it("calcula los periodos en Lima, incluido el cambio de año", () => {
    expect(sunatPilotMonths(new Date("2027-01-01T02:00:00Z"))).toEqual({
      current: "2026-12",
      previous: "2026-11",
    });
    expect(sunatPilotMonths(new Date("2027-01-01T06:00:00Z"))).toEqual({
      current: "2027-01",
      previous: "2026-12",
    });
  });
});
