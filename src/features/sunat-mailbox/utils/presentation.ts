import { SUNAT_ERROR_MESSAGES } from "@/domain/sunat/constants/sunat";
import type {
  SunatJob,
  SunatWorkspace,
} from "@/domain/sunat/types/sunat.types";

export function activeSunatJob(
  workspace: SunatWorkspace,
): SunatJob | undefined {
  return workspace.jobs.find(
    (job) => job.state === "queued" || job.state === "running",
  );
}
export function sunatErrorMessage(code: string | null): string {
  return code
    ? (SUNAT_ERROR_MESSAGES[code] ??
        "La consulta necesita revisión. Código: " + code)
    : "";
}
export function sunatDate(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat("es-PE", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Lima",
      }).format(new Date(value))
    : "Todavía no consultado";
}
export function canResumeSunatMonth(
  workspace: SunatWorkspace | undefined,
  year: number,
  month: number,
): boolean {
  const period = `${year}-${String(month).padStart(2, "0")}-01`;
  const previous = workspace?.jobs.find(
    (job) => job.kind === "monthly" && job.from_date === period,
  );
  return (
    previous?.state === "partial" && previous.error_code === "BUDGET_EXHAUSTED"
  );
}
