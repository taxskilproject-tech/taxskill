import { documentaryProfileSchema } from "@/domain/company-profile/contracts/profile.schema";
import type {
  ApplicabilityKey,
  ChecklistSelection,
  DocumentaryProfile,
} from "@/domain/company-profile/types/profile.types";

export function emptyChecklist(): ChecklistSelection {
  return {
    schema_version: 1,
    plame: false,
    afp: false,
    igv_renta: false,
    health_coverage: "",
  };
}
export function parseChecklist(selection: ChecklistSelection) {
  return documentaryProfileSchema.safeParse({
    ...selection,
    health_coverage: selection.plame ? selection.health_coverage : "none",
  });
}
export function appliesToProfile(
  profile: DocumentaryProfile,
  module: string,
  condition: ApplicabilityKey = "always",
) {
  if (module === "tributario" && !profile.igv_renta) return false;
  if (
    ["laboral_general", "laboral_trabajador"].includes(module) &&
    !profile.plame
  )
    return false;
  if (condition === "afp") return profile.afp && profile.plame;
  if (condition === "sis" || condition === "essalud")
    return profile.health_coverage === condition;
  if (condition === "plame") return profile.plame;
  return true;
}
export function documentCondition(
  code: string,
  module: string,
): ApplicabilityKey {
  if (["laboral_planilla_afp", "laboral_pago_afp"].includes(code)) return "afp";
  if (["laboral_reporte_sis", "laboral_pago_sis"].includes(code)) return "sis";
  if (["laboral_reporte_essalud", "laboral_pago_essalud"].includes(code))
    return "essalud";
  return module.startsWith("laboral_") ? "plame" : "always";
}
export function documentAppliesToProfile(
  profile: DocumentaryProfile | null | undefined,
  code: string,
  module: string,
) {
  return (
    !profile ||
    appliesToProfile(profile, module, documentCondition(code, module))
  );
}
