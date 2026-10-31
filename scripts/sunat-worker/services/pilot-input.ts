import { readFileSync } from "node:fs";

import {
  decryptSunatCredentials,
  parseSunatKeyring,
} from "../../../src/features/sunat-mailbox/services/credentials-crypto.server";
import { pilotRunInputSchema } from "../contracts/pilot-run.schema";

export function loadAuthorizedPilot() {
  const input = pilotRunInputSchema.parse(
    JSON.parse(readFileSync("/private/pilot.json", "utf8")),
  );
  const keys = parseSunatKeyring(
    process.env.SUNAT_CREDENTIALS_CURRENT_KEY,
    process.env.SUNAT_CREDENTIALS_KEYS,
  );
  const credentials = decryptSunatCredentials(
    input.encrypted,
    input.scope,
    keys,
  );
  if (credentials.ruc !== process.env.SUNAT_PILOT_RUC)
    throw new Error("PILOT_NOT_AUTHORIZED");
  return { input, credentials };
}
