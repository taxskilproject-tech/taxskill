// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import type { SessionListener } from "./types/auth-test.types";

const mocks = vi.hoisted(() => ({
  listener: null as SessionListener | null,
  load: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn(),
  removeChannels: vi.fn(),
}));
vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({
    ok: true,
    data: {
      auth: {
        onAuthStateChange: (callback: SessionListener) => {
          mocks.listener = callback;
          return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
        },
        signOut: mocks.signOut,
      },
      removeAllChannels: mocks.removeChannels,
    },
  }),
}));
vi.mock("@/features/auth/repositories/auth.repository", () => ({
  loadSessionContext: mocks.load,
}));

import { useSessionController } from "@/features/auth/hooks/use-session-controller";

beforeEach(() => {
  mocks.load.mockReset();
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.removeChannels.mockResolvedValue([]);
});
afterEach(cleanup);

it("la respuesta anterior al logout no readmite al usuario ni sus datos", async () => {
  const pending = Promise.withResolvers<unknown>();
  mocks.load.mockReturnValueOnce(pending.promise);
  const { result } = renderHook(useSessionController);
  await act(async () => {
    mocks.listener?.("SIGNED_IN", { user: { id: "fixture" } });
  });
  await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(1));
  await act(async () => {
    await result.current.logout();
  });
  expect(result.current.status).toBe("anonymous");
  await act(async () => {
    pending.resolve({ ok: true, data: { profile: { user_id: "old-user" } } });
  });
  expect(result.current.context).toBeNull();
  expect(result.current.status).toBe("anonymous");
  expect(mocks.removeChannels).toHaveBeenCalledTimes(1);
});
it("una cuenta bloqueada mantiene error explícito sin mostrar contexto anterior", async () => {
  mocks.load.mockResolvedValueOnce({
    ok: false,
    error: { code: "FORBIDDEN", message: "Cuenta inhabilitada" },
  });
  const { result } = renderHook(useSessionController);
  await act(async () => {
    mocks.listener?.("SIGNED_IN", { user: { id: "fixture" } });
  });
  await waitFor(() => expect(result.current.status).toBe("blocked"));
  expect(result.current.context).toBeNull();
  expect(result.current.error?.code).toBe("FORBIDDEN");
});
