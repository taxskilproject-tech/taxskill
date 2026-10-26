// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it } from "vitest";

import { emptyChecklist } from "@/domain/company-profile/utils/profile";
import { CompanyContactFields } from "@/features/companies/components/company-contact-fields";
import { CompanyChecklist } from "@/features/deliverable-templates/components/company-checklist";

import { companyFixture } from "./fixtures/access";

afterEach(cleanup);
it("conserva el régimen informado de una empresa anterior al editar sus contactos", () => {
  const originalRegime = "Nombre histórico del régimen";
  const { container } = render(
    <form>
      <CompanyContactFields
        company={{ ...companyFixture, tax_regime: originalRegime }}
      />
    </form>,
  );
  const form = container.querySelector("form");
  if (!form) throw new Error("Formulario ausente.");
  expect(new FormData(form).get("tax_regime")).toBe(originalRegime);
  expect(
    screen
      .getByRole("option", {
        name: "Conservar registro anterior: " + originalRegime,
      })
      .matches(":checked"),
  ).toBe(true);
});
function ChecklistHarness() {
  const [value, setValue] = useState(emptyChecklist);
  return <CompanyChecklist value={value} onChange={setValue} />;
}
it("no preselecciona, bloquea AFP y limpia dependencias sin perder IGV", () => {
  render(<ChecklistHarness />);
  const afp = screen.getByRole("checkbox", { name: /AFP · incluir/ });
  const plame = screen.getByRole("checkbox", { name: /PLAME · habilitar/ });
  const igv = screen.getByRole("checkbox", { name: /IGV renta/ });
  expect(afp.getAttribute("disabled")).not.toBeNull();
  expect(screen.queryByRole("combobox")).toBeNull();
  expect(
    screen
      .getAllByRole("checkbox")
      .every((item) => item.getAttribute("checked") === null),
  ).toBe(true);
  fireEvent.click(igv);
  fireEvent.click(plame);
  expect(afp.getAttribute("disabled")).toBeNull();
  fireEvent.click(afp);
  fireEvent.change(screen.getByLabelText("Cobertura laboral"), {
    target: { value: "essalud" },
  });
  fireEvent.click(plame);
  expect(screen.queryByRole("combobox")).toBeNull();
  expect(afp.matches(":checked")).toBe(false);
  expect(igv.matches(":checked")).toBe(true);
  fireEvent.click(plame);
  expect(
    screen.getByLabelText("Cobertura laboral").getAttribute("value"),
  ).not.toBe("essalud");
  expect(
    screen
      .getByRole("option", { name: "Seleccionar cobertura" })
      .matches(":checked"),
  ).toBe(true);
});
