import { pilotMonthSchema } from "../contracts/pilot-run.schema";

export function pilotMonthWindow(input: string) {
  const month = pilotMonthSchema.parse(input);
  const closing = new Date(month + "-01T00:00:00.000Z");
  closing.setUTCMonth(closing.getUTCMonth() + 1, 0);
  return {
    from: month + "-01",
    through: closing.toISOString().slice(0, 10),
  };
}
