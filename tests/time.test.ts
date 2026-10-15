import { expect, it, vi } from "vitest";

import {
  formatCivilDate,
  parseCivilDate,
} from "@/domain/time/utils/civil-date";
import {
  formatLimaDateTime,
  getLimaDate,
  isPastCivilDeadline,
} from "@/domain/time/utils/instant";

it.each(["2026-02-29", "2026-04-31", "2026-2-01", "0000-01-01", "", null])(
  "rechaza una fecha civil inválida: %s",
  (value) => expect(parseCivilDate(value).ok).toBe(false),
);

it("conserva bisiestos válidos y no convierte la fecha civil a otro día", () => {
  vi.stubEnv("TZ", "America/Los_Angeles");
  expect(parseCivilDate("2028-02-29")).toEqual({
    ok: true,
    data: { iso: "2028-02-29", year: 2028, month: 2, day: 29 },
  });
  expect(formatCivilDate("2026-01-31")).toEqual({
    ok: true,
    data: "31/01/2026",
  });
  vi.unstubAllEnvs();
});

it("obtiene la fecha de Lima alrededor del cambio de día UTC", () => {
  expect(getLimaDate("2026-10-15T04:59:59.999Z")).toEqual({
    ok: true,
    data: "2026-10-14",
  });
  expect(getLimaDate("2026-10-15T05:00:00.000Z")).toEqual({
    ok: true,
    data: "2026-10-15",
  });
});

it("considera el vencimiento al cierre civil, incluso durante fin de semana", () => {
  expect(isPastCivilDeadline("2026-10-14", "2026-10-15T04:59:59.999Z")).toEqual(
    { ok: true, data: false },
  );
  expect(isPastCivilDeadline("2026-10-14", "2026-10-15T05:00:00Z")).toEqual({
    ok: true,
    data: true,
  });
  expect(isPastCivilDeadline("2026-10-17", "2026-10-18T05:00:00Z")).toEqual({
    ok: true,
    data: true,
  });
});

it("rechaza momentos ambiguos y fechas inválidas sin lanzar errores de Intl", () => {
  expect(getLimaDate("2026-10-14").ok).toBe(false);
  expect(getLimaDate("2026-10-14T12:30:00").ok).toBe(false);
  expect(getLimaDate("2026-02-30T12:00:00Z").ok).toBe(false);
  expect(getLimaDate("2026-10-14T24:00:00Z").ok).toBe(false);
  expect(formatLimaDateTime(new Date("invalid")).ok).toBe(false);
  expect(isPastCivilDeadline("incorrecta", new Date()).ok).toBe(false);
});
