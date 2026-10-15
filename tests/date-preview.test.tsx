// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { DatePreview } from "@/features/setup/components/date-preview";

afterEach(cleanup);

it("sincroniza fechas confirmadas al salir del control nativo", () => {
  render(<DatePreview />);
  const field = screen.getByLabelText("Fecha de referencia");
  fireEvent.blur(field, { target: { value: "2028-02-29" } });
  expect(screen.getByRole("status").textContent).toContain("29/02/2028");
});

it("relaciona etiqueta/error con el campo y valida sin loading artificial", () => {
  render(<DatePreview />);
  const field = screen.getByLabelText("Fecha de referencia");
  fireEvent.input(field, { target: { value: "" } });
  const error = screen.getByRole("alert");
  expect(field.getAttribute("aria-invalid")).toBe("true");
  expect(field.getAttribute("aria-describedby")).toContain(error.id);
  expect(screen.queryByRole("progressbar")).toBeNull();
  fireEvent.input(field, { target: { value: "2028-02-29" } });
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByRole("status").textContent).toContain("29/02/2028");
});
