import { describe, expect, it } from "vitest";

import { TAX_REGIMES } from "@/domain/company-profile/constants/regimes";
import {
  documentaryProfileSchema,
  taxRegimeSchema,
} from "@/domain/company-profile/contracts/profile.schema";
import {
  appliesToProfile,
  documentCondition,
  emptyChecklist,
  parseChecklist,
} from "@/domain/company-profile/utils/profile";
import { deadlineDescription } from "@/features/deliverable-templates/utils/template-presentation";

describe("H09: perfil documental cerrado", () => {
  it.each(TAX_REGIMES)("acepta $code", ({ code }) => {
    expect(taxRegimeSchema.parse(code)).toBe(code);
  });
  it("rechaza texto libre y empieza sin opciones preseleccionadas", () => {
    expect(taxRegimeSchema.safeParse("Régimen inventado").success).toBe(false);
    const checklist = emptyChecklist();
    expect(checklist).toMatchObject({
      plame: false,
      afp: false,
      igv_renta: false,
      health_coverage: "",
    });
    expect(parseChecklist(checklist).success).toBe(false);
  });
  it("requiere cobertura explícita al habilitar PLAME", () => {
    expect(parseChecklist({ ...emptyChecklist(), plame: true }).success).toBe(
      false,
    );
    expect(
      parseChecklist({ ...emptyChecklist(), igv_renta: true }).success,
    ).toBe(true);
  });
  it.each(["none", "sis", "essalud"] as const)(
    "cobertura %s excluye las otras alternativas",
    (coverage) => {
      const profile = documentaryProfileSchema.parse({
        schema_version: 1,
        plame: true,
        afp: true,
        igv_renta: false,
        health_coverage: coverage,
      });
      expect(appliesToProfile(profile, "tributario")).toBe(false);
      expect(appliesToProfile(profile, "laboral_general", "afp")).toBe(true);
      expect(appliesToProfile(profile, "laboral_general", "sis")).toBe(
        coverage === "sis",
      );
      expect(appliesToProfile(profile, "laboral_general", "essalud")).toBe(
        coverage === "essalud",
      );
    },
  );
  it("rechaza AFP sin PLAME y campos de perfil desconocidos", () => {
    const profile = {
      schema_version: 1,
      plame: false,
      afp: true,
      igv_renta: true,
      health_coverage: "none",
    };
    expect(documentaryProfileSchema.safeParse(profile).success).toBe(false);
    expect(
      documentaryProfileSchema.safeParse({
        ...profile,
        afp: false,
        other: true,
      }).success,
    ).toBe(false);
  });
  it("clasifica seguros sin inventar entregables ONP", () => {
    expect(
      documentCondition("laboral_reporte_essalud", "laboral_general"),
    ).toBe("essalud");
    expect(documentCondition("laboral_planilla_afp", "laboral_general")).toBe(
      "afp",
    );
    expect(documentCondition("tributario_pdt", "tributario")).toBe("always");
  });
  it("expresa el vencimiento sin confundirlo con el inicio", () => {
    expect(deadlineDescription(null)).toContain("por configurar");
    expect(deadlineDescription(-3)).toContain("3 días antes");
    expect(deadlineDescription(10)).toContain("10 días después");
    expect(deadlineDescription(0)).toContain("Al cierre");
  });
});
