import { randomUUID } from "node:crypto";

import { claimedJobSchema } from "../../scripts/sunat-worker/contracts/worker.schema";
import {
  encryptSunatCredentials,
  parseSunatKeyring,
} from "../../src/features/sunat-mailbox/services/credentials-crypto.server";

export function sunatWorkerFixtureKeys() {
  return parseSunatKeyring(
    "fixture",
    JSON.stringify({ fixture: "ab".repeat(32) }),
  );
}

export function sunatWorkerClaimFixture() {
  const scope = {
    organization_id: randomUUID(),
    company_id: randomUUID(),
    connection_id: randomUUID(),
    credential_version: 1,
  };
  const keys = sunatWorkerFixtureKeys();
  return claimedJobSchema.parse({
    job: {
      ...scope,
      id: randomUUID(),
      lease_token: randomUUID(),
      kind: "monthly",
      from_date: "2026-10-01",
      through_date: "2026-10-31",
      checkpoint: {},
    },
    company: { id: scope.company_id, ruc: "20000000001" },
    connection: { consented_at: new Date().toISOString(), consent_version: 1 },
    encrypted: encryptSunatCredentials(
      { ruc: "20000000001", username: "fixture", password: "fixture-only" },
      scope,
      keys,
    ),
    message: null,
    attachment: null,
  });
}
