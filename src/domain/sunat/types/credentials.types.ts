import type { z } from "zod";

import type {
  sunatCredentialPayloadSchema,
  sunatCredentialScopeSchema,
  sunatEncryptedSchema,
} from "../contracts/credentials.schema";

export type SunatCredentialPayload = z.infer<
  typeof sunatCredentialPayloadSchema
>;
export type SunatCredentialScope = z.infer<typeof sunatCredentialScopeSchema>;
export type SunatEncrypted = z.infer<typeof sunatEncryptedSchema>;
export interface SunatKeyring {
  current: string;
  keys: Readonly<Record<string, string>>;
}
