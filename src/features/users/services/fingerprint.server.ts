import { createHmac } from "node:crypto";
import "server-only";

import { isRecord } from "@/domain/common/utils/normalize-operation-error";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

export function fingerprintInput(input: unknown, key: string) {
  if (!/^[a-f0-9]{64,}$/i.test(key)) throw new Error("DEPENDENCY_UNAVAILABLE");
  return createHmac("sha256", key)
    .update(JSON.stringify(canonicalize(input)))
    .digest("hex");
}
