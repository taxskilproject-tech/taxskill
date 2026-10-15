// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import type { OperationResult } from "@/domain/common/types/operation.types";
import { failure } from "@/domain/common/utils/operation-result";
import { ConnectionPanel } from "@/features/setup/components/connection-panel";
import { checkSupabaseConnection } from "@/features/setup/repositories/connection.repository";
import type { ConnectionCheck } from "@/features/setup/types/setup.types";

import { publicEnvironment } from "./fixtures/scopes";

vi.mock("@/features/setup/repositories/connection.repository", () => ({
  checkSupabaseConnection: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

function configureEnvironment() {
  vi.stubEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    publicEnvironment.NEXT_PUBLIC_SUPABASE_URL,
  );
  vi.stubEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    publicEnvironment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

it("mantiene loading contextual y deshabilita dobles clics hasta finalizar", async () => {
  configureEnvironment();
  const pending = Promise.withResolvers<OperationResult<ConnectionCheck>>();
  vi.mocked(checkSupabaseConnection).mockReturnValue(pending.promise);
  render(<ConnectionPanel />);
  const button = screen.getByRole("button", { name: "Comprobar conexión" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(button.getAttribute("aria-busy")).toBe("true");
  expect(button.hasAttribute("disabled")).toBe(true);
  expect(button.textContent).toContain("Comprobando conexión");
  expect(checkSupabaseConnection).toHaveBeenCalledTimes(1);
  await act(async () =>
    pending.resolve({ ok: true, data: { checkedAt: "2026-10-14T14:00:00Z" } }),
  );
  expect(button.hasAttribute("disabled")).toBe(false);
  expect(screen.getByRole("status").textContent).toContain(
    "Conexión disponible",
  );
});

it("muestra errores explícitos y permite reintentar", async () => {
  configureEnvironment();
  vi.mocked(checkSupabaseConnection).mockResolvedValue(
    failure("DEPENDENCY_UNAVAILABLE"),
  );
  render(<ConnectionPanel />);
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain("Inténtalo"),
  );
  expect(screen.getByRole("button").hasAttribute("disabled")).toBe(false);
});

it("al desmontar cancela el trabajo en curso", () => {
  configureEnvironment();
  const pending = Promise.withResolvers<OperationResult<ConnectionCheck>>();
  vi.mocked(checkSupabaseConnection).mockReturnValue(pending.promise);
  const view = render(<ConnectionPanel />);
  fireEvent.click(screen.getByRole("button"));
  const signal = vi.mocked(checkSupabaseConnection).mock.calls[0]?.[0];
  view.unmount();
  expect(signal?.aborted).toBe(true);
});

it("una configuración incompleta informa el problema y no ofrece iniciar red", () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  render(<ConnectionPanel />);
  expect(screen.getByRole("alert").textContent).toContain(".env.local");
  expect(screen.getByRole("button").hasAttribute("disabled")).toBe(true);
  expect(checkSupabaseConnection).not.toHaveBeenCalled();
});
