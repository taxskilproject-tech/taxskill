import type { OperationResult } from "@/domain/common/types/operation.types";
import { failure, success } from "@/domain/common/utils/operation-result";
import {
  CIVIL_DATE_LENGTH,
  CIVIL_DATE_PATTERN,
  DISPLAY_LOCALE,
} from "@/domain/time/constants/time";
import type { CivilDate } from "@/domain/time/types/time.types";

export function parseCivilDate(value: unknown): OperationResult<CivilDate> {
  if (typeof value !== "string" || !CIVIL_DATE_PATTERN.test(value)) {
    return failure("VALIDATION_ERROR");
  }

  // Mediodía UTC es solo un portador de calendario, nunca un vencimiento.
  const date = new Date(value + "T12:00:00.000Z");

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() < 1 ||
    date.toISOString().slice(0, CIVIL_DATE_LENGTH) !== value
  ) {
    return failure("VALIDATION_ERROR");
  }

  return success({
    iso: value,
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

export function formatCivilDate(value: string): OperationResult<string> {
  const parsed = parseCivilDate(value);

  if (!parsed.ok) {
    return parsed;
  }

  const formatted = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(parsed.data.iso + "T12:00:00.000Z"));

  return success(formatted);
}
