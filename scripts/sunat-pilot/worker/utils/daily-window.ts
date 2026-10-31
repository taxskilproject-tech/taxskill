import { z } from "zod";

export function dailyMailboxWindow(
  lastSuccessfulDay: unknown,
  currentDay: unknown,
) {
  const through = z.iso.date().parse(currentDay);
  const previous = z.iso.date().nullable().parse(lastSuccessfulDay);
  if (previous !== null && previous > through)
    throw new Error("DAILY_WINDOW_INVALID");
  return { from: previous ?? through.slice(0, 8) + "01", through };
}
