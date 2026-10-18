import type { ScriptQueryResult } from "../types/query-result.types";

export function scriptResult<T>(
  result: ScriptQueryResult<T>,
  label: string,
): NonNullable<T> {
  if (result.error || result.data === null || result.data === undefined)
    throw new Error(label);
  return result.data;
}
