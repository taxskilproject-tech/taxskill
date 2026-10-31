import {
  SUNAT_PILOT_PENDING_EXIT_CODE,
  SUNAT_PILOT_REPORT,
} from "./sunat-pilot/constants/pilot";
import {
  initializeSunatPilotFiles,
  readSunatPilotFiles,
  writeSunatPilotReport,
} from "./sunat-pilot/repositories/pilot-files";
import { assessSunatPilot } from "./sunat-pilot/utils/evaluate-pilot";

function checkSunatPilot() {
  const argumentsList = process.argv.slice(2);
  if (argumentsList.some((argument) => argument !== "--init"))
    throw new Error("PILOT_ARGUMENT_INVALID");
  const now = new Date();
  if (argumentsList.includes("--init")) initializeSunatPilotFiles(now);
  const { request, evidence } = readSunatPilotFiles();
  const report = assessSunatPilot(request, evidence, now);
  writeSunatPilotReport(report);
  console.log(JSON.stringify(report, null, 2));
  console.log(`Informe sin credenciales: ${SUNAT_PILOT_REPORT}`);
  if (report.status !== "ready_for_implementation_review")
    process.exitCode = SUNAT_PILOT_PENDING_EXIT_CODE;
}

try {
  checkSunatPilot();
} catch {
  console.error(
    "No se pudo evaluar el piloto. Usa yarn h10:preflight --init y revisa los JSON privados según integrations/sunat/README.md. No incluyas credenciales en esos archivos.",
  );
  process.exitCode = 1;
}
