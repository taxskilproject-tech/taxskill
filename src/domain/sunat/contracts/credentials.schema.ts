import { z } from "zod";

export const sunatEncryptedSchema = z.strictObject({
  schema_version: z.literal(1),
  algorithm: z.literal("aes-256-gcm"),
  key_id: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/),
  iv: z.string().regex(/^[0-9a-f]{24}$/),
  tag: z.string().regex(/^[0-9a-f]{32}$/),
  ciphertext: z.string().min(1).max(8192),
});
export const sunatCredentialPayloadSchema = z.strictObject({
  ruc: z.string().regex(/^\d{11}$/),
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
});
export const sunatCredentialScopeSchema = z.strictObject({
  organization_id: z.uuid(),
  company_id: z.uuid(),
  connection_id: z.uuid(),
  credential_version: z.number().int().positive(),
});
