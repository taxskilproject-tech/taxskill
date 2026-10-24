import { expect, it } from "vitest";

import { presentationPage } from "@/features/access/utils/presentation-page";
import { safeReturnTo } from "@/features/auth/utils/safe-return-to";
import { megabytesToBytes } from "@/features/documents/utils/file-size";

it("conserva secciones, selección y filtros de regreso sin admitir redirecciones externas", () => {
  const address =
    "/empresas/11111111-1111-4111-8111-111111111111?tab=laboral_trabajador&workerQuery=Ana&workerPage=2&view=documentos";
  expect(safeReturnTo(address)).toBe(address);
  expect(
    safeReturnTo(
      "/actividades?indicators=overdue&deliverableId=abc&memberId=def&password=secret",
    ),
  ).toBe("/actividades?indicators=overdue&deliverableId=abc&memberId=def");
  expect(safeReturnTo("//external.invalid/usuarios")).toBe("/dashboard");
});
it("normaliza páginas inválidas y conserva la conversión exacta de MB a bytes", () => {
  for (const value of ["0", "-1", "NaN", "1.5", "100001"])
    expect(presentationPage(value)).toBe(1);
  expect(presentationPage("2")).toBe(2);
  expect(megabytesToBytes("20")).toBe(20_000_000);
  expect(megabytesToBytes("0.000001")).toBe(1);
  expect(megabytesToBytes("10.125001")).toBe(10_125_001);
});
it("conserva el retorno trabajador → empresa → listado sin admitir destinos anidados externos", () => {
  const company =
    "/empresas/11111111-1111-4111-8111-111111111111?tab=laboral_trabajador&returnTo=" +
    encodeURIComponent("/empresas?q=Ana&page=2");
  const safe = new URL(safeReturnTo(company), "https://taxskills.invalid");
  expect(safe.searchParams.get("returnTo")).toBe("/empresas?q=Ana&page=2");
  expect(
    new URL(
      safeReturnTo("/empresas?returnTo=https://external.invalid"),
      "https://taxskills.invalid",
    ).searchParams.get("returnTo"),
  ).toBe("/dashboard");
});
