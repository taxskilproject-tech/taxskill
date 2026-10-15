import type { OperationResult } from "@/domain/common/types/operation.types";
import { failure, success } from "@/domain/common/utils/operation-result";
import {
  BUSINESS_TIME_ZONE,
  DISPLAY_LOCALE,
  INSTANT_OFFSET_PATTERN,
} from "@/domain/time/constants/time";
import type { InstantInput } from "@/domain/time/types/time.types";
import { parseCivilDate } from "@/domain/time/utils/civil-date";

function parseInstant(value: InstantInput): OperationResult<Date> {
  if (
    typeof value === "string" &&
    (!INSTANT_OFFSET_PATTERN.test(value) ||
      !parseCivilDate(value.slice(0, 10)).ok)
  ) {
    return failure("VALIDATION_ERROR");
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? failure("VALIDATION_ERROR")
    : success(date);
}

export function getLimaDate(value: InstantInput): OperationResult<string> {
  const result = parseInstant(value);
  if (!result.ok) return result;

  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
  }).formatToParts(result.data);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return success(year + "-" + month + "-" + day);
}

export function formatLimaDateTime(
  value: InstantInput,
): OperationResult<string> {
  const result = parseInstant(value);
  if (!result.ok) return result;

  return success(
    new Intl.DateTimeFormat(DISPLAY_LOCALE, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: BUSINESS_TIME_ZONE,
    }).format(result.data),
  );
}

export function isPastCivilDeadline(
  dueDate: string,
  now: InstantInput,
): OperationResult<boolean> {
  const due = parseCivilDate(dueDate);
  if (!due.ok) return due;

  const localDate = getLimaDate(now);
  if (!localDate.ok) return localDate;

  return success(localDate.data > due.data.iso);
}
