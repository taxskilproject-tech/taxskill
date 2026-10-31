import type { SunatPilotRequest } from "../types/pilot.types";
import { sunatPilotMonths } from "./pilot-months";

export function missingSunatPilotRequirements(
  request: SunatPilotRequest,
  now: Date,
) {
  const { company, authorization, months, access, references } = request;
  const requirements = [
    ["pilot_company", Boolean(company.ruc && company.legal_name)],
    [
      "explicit_authorization",
      Boolean(
        authorization.reference &&
        authorization.approved_by &&
        authorization.approved_at &&
        Date.parse(authorization.approved_at) <= now.getTime() &&
        authorization.allow_read &&
        authorization.allow_download &&
        authorization.allow_local_evidence,
      ),
    ],
    ["current_month", months.current === sunatPilotMonths(now).current],
    [
      "known_previous_month",
      Boolean(
        months.previous && months.current && months.previous < months.current,
      ),
    ],
    ["sol_user", access.sol_user_available],
    ["mailbox_permission", access.mailbox_permission_confirmed],
    ["private_credential_entry", access.private_entry_arranged],
    ["known_message", references.known_message_available],
    ["known_attachment", references.known_attachment_available],
  ] as const;
  return requirements.filter(([, present]) => !present).map(([name]) => name);
}
