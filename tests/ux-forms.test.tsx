// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { SidePanel } from "@/components/organisms/side-panel";
import { FormSteps } from "@/features/access/components/form-steps";
import { useFormSteps } from "@/features/access/hooks/use-form-steps";
import { RuleSlots } from "@/features/documents/components/rule-slots";

const saved = vi.fn();
function WizardFixture() {
  const form = useRef<HTMLFormElement>(null);
  const steps = useFormSteps(form, 4);
  return (
    <form
      ref={form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (steps.validate()) saved(new FormData(event.currentTarget));
      }}
    >
      <FormSteps
        labels={["Contexto", "Periodo", "Archivos", "Resumen"]}
        step={steps.step}
        onSelect={steps.select}
        onNext={steps.next}
        onBack={steps.back}
      />
      <div data-form-step="0" hidden={steps.step !== 0}>
        <label>
          Título
          <input name="title" required />
        </label>
      </div>
      <div data-form-step="1" hidden={steps.step !== 1}>
        <label>
          Fecha
          <input name="date" required type="date" />
        </label>
      </div>
      <div data-form-step="2" hidden={steps.step !== 2}>
        <RuleSlots maximum={20_000_000} />
      </div>
      <div data-form-step="3" hidden={steps.step !== 3}>
        <button type="submit">Guardar todo</button>
      </div>
    </form>
  );
}
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  saved.mockClear();
});
it("bloquea el avance inválido, conserva datos ocultos y revela el paso del error final", async () => {
  render(<WizardFixture />);
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  expect(screen.getByText(/Paso 1 de 4/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Título"), {
    target: { value: "Obligación nueva" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  expect(screen.getByText(/Paso 2 de 4/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Anterior paso" }));
  expect(screen.getByLabelText("Título")).toHaveProperty(
    "value",
    "Obligación nueva",
  );
  fireEvent.click(screen.getByRole("button", { name: "Resumen" }));
  fireEvent.click(screen.getByRole("button", { name: "Guardar todo" }));
  await waitFor(() => expect(screen.getByText(/Paso 2 de 4/)).toBeTruthy());
  expect(saved).not.toHaveBeenCalled();
});
it("envía todas las posiciones aunque solo una esté visible y convierte MB sin cambiar el contrato", () => {
  render(<WizardFixture />);
  fireEvent.change(screen.getByLabelText("Título"), {
    target: { value: "Regla" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  fireEvent.change(screen.getByLabelText("Fecha"), {
    target: { value: "2026-10-24" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  fireEvent.change(
    within(
      screen.getByRole("group", { name: "Archivo requerido 1" }),
    ).getByLabelText("Nombre del archivo requerido"),
    { target: { value: "Declaración" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Archivo 2" }));
  fireEvent.change(
    within(
      screen.getByRole("group", { name: "Archivo requerido 2" }),
    ).getByLabelText("Nombre del archivo requerido"),
    { target: { value: "Constancia" } },
  );
  fireEvent.change(
    within(
      screen.getByRole("group", { name: "Archivo requerido 2" }),
    ).getByLabelText("Tamaño máximo (MB)"),
    { target: { value: "1.5" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  fireEvent.click(screen.getByRole("button", { name: "Guardar todo" }));
  const payload = saved.mock.calls[0][0];
  expect(payload.get("title")).toBe("Regla");
  expect(payload.get("slot_label_1")).toBe("Declaración");
  expect(payload.get("slot_label_2")).toBe("Constancia");
  expect(payload.get("slot_max_2")).toBe("1500000");
  expect(payload.getAll("slot_formats_1")).toEqual(["pdf"]);
});
it("revela el archivo oculto que impide avanzar sin perder las otras posiciones", async () => {
  render(<WizardFixture />);
  fireEvent.change(screen.getByLabelText("Título"), {
    target: { value: "Regla" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  fireEvent.change(screen.getByLabelText("Fecha"), {
    target: { value: "2026-10-24" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  fireEvent.click(screen.getByRole("button", { name: "Archivo 2" }));
  fireEvent.change(
    within(
      screen.getByRole("group", { name: "Archivo requerido 2" }),
    ).getByLabelText("Nombre del archivo requerido"),
    { target: { value: "" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Archivo 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  await waitFor(() =>
    expect(
      screen.getByRole("group", { name: "Archivo requerido 2" }),
    ).toBeTruthy(),
  );
  expect(screen.getByText(/Paso 3 de 4/)).toBeTruthy();
  expect(saved).not.toHaveBeenCalled();
});
it("pide descartar cambios, mantiene el formulario al continuar y bloquea cerrar durante una acción", () => {
  const close = vi.fn();
  const { rerender } = render(
    <SidePanel title="Editar" onClose={close}>
      <form>
        <label>
          Nombre
          <input name="name" />
        </label>
        <button type="button">Cancelar</button>
      </form>
    </SidePanel>,
  );
  fireEvent.change(screen.getByLabelText("Nombre"), {
    target: { value: "Cambio" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
  expect(close).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
  expect(screen.getByLabelText("Nombre")).toHaveProperty("value", "Cambio");
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  fireEvent.click(screen.getByRole("button", { name: "Descartar y cerrar" }));
  expect(close).toHaveBeenCalledOnce();
  rerender(
    <SidePanel title="Editar" onClose={close}>
      <button aria-busy="true">Guardando…</button>
    </SidePanel>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
  expect(close).toHaveBeenCalledOnce();
});
