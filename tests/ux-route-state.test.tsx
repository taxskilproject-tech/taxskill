// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { useCurrentRoute } from "@/features/access/hooks/use-current-route";
import { usePresentation } from "@/features/access/hooks/use-presentation";

const navigation = vi.hoisted(() => ({
  pathname: "/empresas/11111111-1111-4111-8111-111111111111",
  parameters: new URLSearchParams(),
  replace: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => navigation.parameters,
  useRouter: () => ({ replace: navigation.replace }),
}));
afterEach(cleanup);

it("conserva el origen real sin añadir defaults que separen la posición de scroll", () => {
  navigation.parameters = new URLSearchParams("tab=laboral_trabajador");
  const { result } = renderHook(useCurrentRoute);
  expect(result.current).toBe(`${navigation.pathname}?tab=laboral_trabajador`);
});

it("cambia el filtro laboral y reinicia su página en una única navegación", () => {
  navigation.parameters = new URLSearchParams(
    "tab=laboral_trabajador&workerPage=3&workerQuery=Ana&obligationPage=2",
  );
  const { result } = renderHook(() => usePresentation("workerQuery", ""));
  act(() => result.current[1]("Luis"));
  expect(navigation.replace).toHaveBeenCalledTimes(1);
  const address = new URL(navigation.replace.mock.calls[0][0], "http://local");
  expect(address.searchParams.get("workerQuery")).toBe("Luis");
  expect(address.searchParams.has("workerPage")).toBe(false);
  expect(address.searchParams.get("tab")).toBe("laboral_trabajador");
  expect(address.searchParams.get("obligationPage")).toBe("2");
});
