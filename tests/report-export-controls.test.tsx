// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ExportControls } from "@/features/reporting/components/export-controls";
import type { GeneratedReport } from "@/features/reporting/types/export.types";

import { reportingPayload, reportingResult } from "./fixtures/reporting";

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  company: "company-a",
}));
vi.mock("@/features/reporting/services/report-export", () => ({
  generateReport: mocks.generate,
}));
vi.mock("@/features/auth/providers/workspace-context", () => ({
  useWorkspace: () => ({
    context: {
      profile: { user_id: "fixture" },
      organization: { id: "fixture" },
      capabilities: [],
    },
    company: mocks.company,
  }),
}));
const props = {
  allowed: true,
  filters: reportingPayload.filters,
  result: reportingResult,
};
beforeEach(() => {
  mocks.generate.mockReset();
  mocks.company = "company-a";
});
afterEach(cleanup);

it("keeps controls disabled while cancelling and preserves an uncertain audit error", async () => {
  const gate = Promise.withResolvers<GeneratedReport>();
  mocks.generate.mockReturnValue(gate.promise);
  render(<ExportControls {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Exportar Excel" }));
  expect(
    screen
      .getByRole("button", { name: "Generando Excel…" })
      .hasAttribute("disabled"),
  ).toBe(true);
  expect(
    screen
      .getByRole("button", { name: "Exportar PDF" })
      .hasAttribute("disabled"),
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Cancelar exportación" }));
  const cancelling = screen.getByRole("button", { name: "Cancelando…" });
  expect(cancelling.getAttribute("aria-busy")).toBe("true");
  expect(cancelling.hasAttribute("disabled")).toBe(true);
  expect(mocks.generate.mock.calls[0][0].signal.aborted).toBe(true);
  await act(async () =>
    gate.reject(
      new Error(
        "El resultado de auditoría requiere conciliación. Referencia: fixture.",
      ),
    ),
  );
  expect(screen.getByRole("alert").textContent).toContain(
    "requiere conciliación",
  );
  expect(
    screen
      .getByRole("button", { name: "Exportar Excel" })
      .hasAttribute("disabled"),
  ).toBe(false);
  expect(screen.queryByRole("button", { name: "Cancelando…" })).toBeNull();
});

it("aborts on context change and discards old progress and failures", async () => {
  const gate = Promise.withResolvers<GeneratedReport>();
  mocks.generate.mockReturnValue(gate.promise);
  const { rerender } = render(<ExportControls {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Exportar Excel" }));
  mocks.company = "company-b";
  rerender(<ExportControls {...props} />);
  const run = mocks.generate.mock.calls[0][0];
  expect(run.signal.aborted).toBe(true);
  await act(async () => {
    run.onProgress("Progreso de otra empresa");
    gate.reject(new Error("Error de otra empresa"));
  });
  expect(screen.queryByText("Progreso de otra empresa")).toBeNull();
  expect(screen.queryByText("Error de otra empresa")).toBeNull();
  expect(
    screen
      .getByRole("button", { name: "Exportar Excel" })
      .hasAttribute("disabled"),
  ).toBe(false);
});
