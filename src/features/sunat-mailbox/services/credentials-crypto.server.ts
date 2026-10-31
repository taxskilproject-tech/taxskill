import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";

import {
  sunatCredentialPayloadSchema,
  sunatCredentialScopeSchema,
  sunatEncryptedSchema,
} from "@/domain/sunat/contracts/credentials.schema";
import type {
  SunatCredentialPayload,
  SunatCredentialScope,
  SunatEncrypted,
  SunatKeyring,
} from "@/domain/sunat/types/credentials.types";

const keysSchema = z.record(
  z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/),
  z.string().regex(/^[0-9a-fA-F]{64}$/),
);

export function parseSunatKeyring(
  current: unknown,
  serializedKeys: unknown,
): SunatKeyring {
  try {
    const identifier = z.string().min(1).max(40).parse(current);
    const keys = keysSchema.parse(JSON.parse(z.string().parse(serializedKeys)));
    if (!keys[identifier]) throw new Error("MISSING_KEY");
    return { current: identifier, keys };
  } catch {
    throw new Error("SUNAT_KEYS_NOT_CONFIGURED");
  }
}

function associatedData(scope: SunatCredentialScope): Buffer {
  const valid = sunatCredentialScopeSchema.parse(scope);
  return Buffer.from(
    JSON.stringify([
      valid.organization_id,
      valid.company_id,
      valid.connection_id,
      valid.credential_version,
    ]),
  );
}

export function encryptSunatCredentials(
  payload: SunatCredentialPayload,
  scope: SunatCredentialScope,
  keyring: SunatKeyring,
): SunatEncrypted {
  const valid = sunatCredentialPayloadSchema.parse(payload);
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    Buffer.from(keyring.keys[keyring.current], "hex"),
    iv,
  );
  cipher.setAAD(associatedData(scope));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(valid), "utf8"),
    cipher.final(),
  ]);
  return {
    schema_version: 1,
    algorithm: "aes-256-gcm",
    key_id: keyring.current,
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
    ciphertext: encrypted.toString("base64"),
  };
}

export function decryptSunatCredentials(
  input: unknown,
  scope: SunatCredentialScope,
  keyring: SunatKeyring,
): SunatCredentialPayload {
  try {
    const encrypted = sunatEncryptedSchema.parse(input);
    const key = keyring.keys[encrypted.key_id];
    if (!key) throw new Error("UNKNOWN_KEY");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(key, "hex"),
      Buffer.from(encrypted.iv, "hex"),
    );
    decipher.setAAD(associatedData(scope));
    decipher.setAuthTag(Buffer.from(encrypted.tag, "hex"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
      decipher.final(),
    ]);
    return sunatCredentialPayloadSchema.parse(
      JSON.parse(plaintext.toString("utf8")),
    );
  } catch {
    throw new Error("SUNAT_CREDENTIALS_UNREADABLE");
  }
}
