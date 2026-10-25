// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { RecordInspector } from "@/components/organisms/record-inspector";
import { Pagination } from "@/features/access/components/pagination";

const mounted = vi.fn();
function DetailProbe() {
  useEffect(() => {
    mounted();
  }, []);
  return <p>Antes y después de la revisión</p>;
}
beforeEach(() => {
  mounted.mockReset();
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
});
afterEach(cleanup);

it("monta el detalle bajo demanda y devuelve el foco sin expandir el listado", () => {
  render(
    <RecordInspector title="Documento mensual">
      <DetailProbe />
    </RecordInspector>,
  );
  const opener = screen.getByRole("button", {
    name: "Ver detalle: Documento mensual",
  });
  expect(mounted).not.toHaveBeenCalled();
  opener.focus();
  fireEvent.click(opener);
  expect(
    screen.getByRole("dialog", { name: "Documento mensual" }),
  ).toBeTruthy();
  expect(mounted).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(opener);
});
it("avisa antes de cerrar cambios del inspector y conserva el formulario al continuar", () => {
  render(
    <RecordInspector title="Configuración">
      <form>
        <label>
          Motivo
          <input aria-label="Motivo" />
        </label>
      </form>
    </RecordInspector>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Ver detalle: Configuración" }),
  );
  fireEvent.change(screen.getByRole("textbox", { name: "Motivo" }), {
    target: { value: "Conservar historial" },
  });
  fireEvent(
    screen.getByRole("dialog"),
    new Event("cancel", { bubbles: true, cancelable: true }),
  );
  expect(screen.getByText("Hay cambios sin guardar")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
  expect(
    screen.getByRole<HTMLInputElement>("textbox", { name: "Motivo" }).value,
  ).toBe("Conservar historial");
});
it("muestra solo el conteo en una página y conserva controles cuando hay más resultados", () => {
  const onPage = vi.fn();
  const view = render(<Pagination count={7} page={1} onPage={onPage} />);
  expect(screen.queryByRole("button")).toBeNull();
  expect(screen.getByLabelText("7 registros · Página 1 de 1")).toBeTruthy();
  view.rerender(<Pagination count={26} page={1} onPage={onPage} />);
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
  expect(onPage).toHaveBeenCalledWith(2);
});
