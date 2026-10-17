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
  context: {
    user: "user-a",
    organization: "org-a",
    company: "company-a",
    permission: "reports.export",
  },
}));
vi.mock("@/features/reporting/services/report-export", () => ({
  generateReport: mocks.generate,
}));
vi.mock("@/features/auth/providers/workspace-context", () => ({
  useWorkspace: () => ({
    context: {
      profile: { user_id: mocks.context.user },
      organization: { id: mocks.context.organization },
      capabilities: [{ action: mocks.context.permission }],
    },
    company: mocks.context.company,
  }),
}));
const props = {
  allowed: true,
  filters: reportingPayload.filters,
  result: reportingResult,
};
beforeEach(() => {
  mocks.generate.mockReset();
  mocks.context = {
    user: "user-a",
    organization: "org-a",
    company: "company-a",
    permission: "reports.export",
  };
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
    () => undefined,
  );
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: vi.fn(() => "blob:fixture"),
      revokeObjectURL: vi.fn(),
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it.each(["success", "error"])(
  "discards completed %s feedback when switching between cached results",
  async (outcome) => {
    const gate = Promise.withResolvers<GeneratedReport>();
    mocks.generate.mockReturnValue(gate.promise);
    const { rerender } = render(<ExportControls {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Exportar Excel" }));
    await act(async () => {
      if (outcome === "success")
        gate.resolve({
          blob: new Blob(["fixture"]),
          filename: "fixture.xlsx",
          rows: reportingResult.rows,
        });
      else gate.reject(new Error("Error anterior de exportación"));
    });
    expect(
      outcome === "success"
        ? screen.getByRole("status").textContent
        : screen.getByRole("alert").textContent,
    ).toContain(
      outcome === "success" ? "Archivo preparado: 1" : "Error anterior",
    );
    // Rerender with ready data keeps the controls mounted, as a cached query does.
    rerender(
      <ExportControls
        {...props}
        filters={{ ...props.filters, report: "observed" }}
        result={{ ...reportingResult, rows: [], count: 0 }}
      />,
    );
    expect(screen.getByRole("status").textContent).toContain(
      "las 0 obligaciones",
    );
    expect(screen.queryByRole("alert")).toBeNull();
    rerender(<ExportControls {...props} />);
    expect(screen.getByRole("status").textContent).not.toContain(
      "Archivo preparado",
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  },
);

it.each(["user", "organization", "company", "permission"] as const)(
  "clears feedback when %s changes without unmounting",
  async (field) => {
    mocks.generate.mockRejectedValue(new Error("Referencia anterior"));
    const { rerender } = render(<ExportControls {...props} />);
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Exportar Excel" })),
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "Referencia anterior",
    );
    mocks.context[field] += "-changed";
    rerender(<ExportControls {...props} />);
    expect(screen.queryByRole("alert")).toBeNull();
  },
);

it("cannot revive a discarded run after leaving and returning to the same cached identity", async () => {
  const gate = Promise.withResolvers<GeneratedReport>();
  mocks.generate.mockReturnValue(gate.promise);
  const { rerender } = render(<ExportControls {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Exportar Excel" }));
  const run = mocks.generate.mock.calls[0][0];
  act(() => run.onProgress("Progreso anterior"));
  rerender(
    <ExportControls
      {...props}
      filters={{ ...props.filters, report: "observed" }}
    />,
  );
  expect(run.signal.aborted).toBe(true);
  expect(
    screen
      .getByRole("button", { name: "Cancelando exportación…" })
      .hasAttribute("disabled"),
  ).toBe(true);
  rerender(<ExportControls {...props} />);
  await act(async () => {
    run.onProgress("Progreso tardío");
    gate.reject(new Error("Error tardío"));
  });
  expect(screen.getByRole("status").textContent).toContain(
    "las 1 obligaciones",
  );
  expect(screen.queryByRole("alert")).toBeNull();
  expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
});
