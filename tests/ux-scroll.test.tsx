// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { useScrollRestoration } from "@/features/auth/hooks/use-scroll-restoration";

const navigation = vi.hoisted(() => ({ pathname: "/actividades" }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("ignora el scroll de Next sobre la ruta saliente y recupera la posición del listado", () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  Object.defineProperty(document.documentElement, "scrollHeight", {
    configurable: true,
    value: 5000,
  });
  const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  window.history.replaceState(null, "", "/actividades");
  const { rerender } = renderHook(() => useScrollRestoration("ux-scroll-user"));
  Object.defineProperty(window, "scrollY", { configurable: true, value: 1200 });
  act(() => window.dispatchEvent(new Event("scroll")));
  window.history.pushState(null, "", "/actividades/detalle");
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  act(() => window.dispatchEvent(new Event("scroll")));
  navigation.pathname = "/actividades/detalle";
  rerender();
  window.history.pushState(null, "", "/actividades");
  navigation.pathname = "/actividades";
  rerender();
  expect(scrollTo).toHaveBeenLastCalledWith(0, 1200);
});
