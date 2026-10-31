import type { Server } from "node:http";
import type { z } from "zod";

import type { mailboxLabScenarioSchema } from "../contracts/lab.schema";
import type { MailboxPage } from "./mailbox.types";

export type MailboxLabScenario = z.infer<typeof mailboxLabScenarioSchema>;
export interface MailboxLabRequest {
  scenario: MailboxLabScenario;
  page: number;
  attempt: number;
  renewed: boolean;
}
export interface MailboxLabResponse {
  status: number;
  payload: MailboxPage | null;
}
export interface MailboxLabProvider {
  server: Server;
  origin: string;
  requests(): number;
}
export interface MailboxLabCheck {
  name: string;
  passed: boolean;
}
