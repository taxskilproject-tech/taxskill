// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, expect, it } from "vitest";

import { SidePanel } from "@/components/organisms/side-panel";

function NestedPanels() {
  const [outer, setOuter] = useState(true);
  const [inner, setInner] = useState(false);
  if (!outer) return null;
  return (
    <SidePanel title="Usuario" onClose={() => setOuter(false)}>
      <button onClick={() => setInner(true)}>Revisar conservación</button>
      {inner && (
        <SidePanel title="Conservación" onClose={() => setInner(false)}>
          <p>El historial se conserva.</p>
        </SidePanel>
      )}
    </SidePanel>
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
});
afterEach(cleanup);

it("mantiene bloqueado el fondo al cerrar la conservación de un panel de usuario", () => {
  render(<NestedPanels />);
  fireEvent.click(screen.getByRole("button", { name: "Revisar conservación" }));
  fireEvent.click(
    within(screen.getByRole("dialog", { name: "Conservación" })).getByRole(
      "button",
      { name: "Cerrar" },
    ),
  );
  expect(document.body.classList.contains("overflow-hidden")).toBe(true);
  expect(screen.queryByRole("dialog", { name: "Conservación" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
  expect(document.body.classList.contains("overflow-hidden")).toBe(false);
});
