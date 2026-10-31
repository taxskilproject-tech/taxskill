import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  SUNAT_PILOT_DIRECTORY,
  SUNAT_PILOT_EXAMPLES,
  SUNAT_PILOT_REPORT,
} from "../constants/pilot";
import {
  sunatPilotEvidenceSchema,
  sunatPilotRequestSchema,
} from "../contracts/pilot.schema";
import type {
  SunatPilotAssessment,
  SunatPilotFiles,
} from "../types/pilot.types";
import { sunatPilotMonths } from "../utils/pilot-months";

function readJson(filename: string): unknown {
  try {
    return JSON.parse(readFileSync(filename, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    throw new Error("PILOT_FILE_UNREADABLE");
  }
}

function writeNewJson(filename: string, value: unknown): boolean {
  if (existsSync(filename)) return false;
  mkdirSync(dirname(filename), { recursive: true });
  writeFileSync(filename, JSON.stringify(value, null, 2) + "\n", {
    flag: "wx",
  });
  return true;
}

export function initializeSunatPilotFiles(now: Date): void {
  const request = sunatPilotRequestSchema.parse(
    readJson(join(SUNAT_PILOT_EXAMPLES, "pilot-request.example.json")),
  );
  const evidence = sunatPilotEvidenceSchema.parse(
    readJson(join(SUNAT_PILOT_EXAMPLES, "pilot-evidence.example.json")),
  );
  writeNewJson(join(SUNAT_PILOT_DIRECTORY, "request.json"), {
    ...request,
    months: sunatPilotMonths(now),
  });
  writeNewJson(join(SUNAT_PILOT_DIRECTORY, "evidence.json"), evidence);
}

export function readSunatPilotFiles(): SunatPilotFiles {
  const request = sunatPilotRequestSchema.safeParse(
    readJson(join(SUNAT_PILOT_DIRECTORY, "request.json")),
  );
  const evidence = sunatPilotEvidenceSchema.safeParse(
    readJson(join(SUNAT_PILOT_DIRECTORY, "evidence.json")),
  );
  if (!request.success || !evidence.success)
    throw new Error("PILOT_INPUT_INVALID");
  return { request: request.data, evidence: evidence.data };
}

export function writeSunatPilotReport(report: SunatPilotAssessment): void {
  mkdirSync(dirname(SUNAT_PILOT_REPORT), { recursive: true });
  writeFileSync(SUNAT_PILOT_REPORT, JSON.stringify(report, null, 2) + "\n");
}
