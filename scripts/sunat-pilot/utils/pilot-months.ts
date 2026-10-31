import { SUNAT_PILOT_TIMEZONE } from "../constants/pilot";

export function sunatPilotMonths(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SUNAT_PILOT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month) throw new Error("PILOT_DATE_INVALID");
  const previous = new Date(Date.UTC(Number(year), Number(month) - 2, 1));
  return {
    current: `${year}-${month}`,
    previous: previous.toISOString().slice(0, 7),
  };
}
