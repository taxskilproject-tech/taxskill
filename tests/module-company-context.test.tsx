// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { useCompanyContext } from "@/features/auth/hooks/use-company-context";

import {
  moduleCompanyA,
  moduleCompanyB,
  moduleContext,
} from "./fixtures/module-navigation";

const navigation = vi.hoisted(() => ({
  pathname: "/empresas",
  parameters: new URLSearchParams(),
  replace: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => navigation.parameters,
  useRouter: () => ({ replace: navigation.replace }),
}));
beforeEach(() => {
  navigation.pathname = `/empresas/${moduleCompanyA}`;
  navigation.parameters = new URLSearchParams("tab=tributario");
});
afterEach(cleanup);

it("sincroniza la empresa en el primer render de una URL directa y la conserva fuera del módulo", () => {
  const { result, rerender } = renderHook(() =>
    useCompanyContext(moduleContext),
  );
  expect(result.current.company).toEqual({
    kind: "company",
    companyId: moduleCompanyA,
  });
  navigation.pathname = "/documentos";
  navigation.parameters = new URLSearchParams();
  rerender();
  expect(result.current.company).toEqual({
    kind: "company",
    companyId: moduleCompanyA,
  });
});

it("cambia de empresa sin mantener filtros ni consultar el recurso anterior con el contexto nuevo", () => {
  navigation.parameters.set("obligationPage", "4");
  const { result, rerender } = renderHook(() =>
    useCompanyContext(moduleContext),
  );
  act(() => result.current.selectCompany(moduleCompanyB));
  expect(navigation.replace).toHaveBeenLastCalledWith(
    `/empresas/${moduleCompanyB}?tab=tributario`,
  );
  expect(result.current.company).toEqual({
    kind: "company",
    companyId: moduleCompanyA,
  });
  navigation.pathname = `/empresas/${moduleCompanyB}`;
  navigation.parameters = new URLSearchParams("tab=tributario");
  rerender();
  expect(result.current.company).toEqual({
    kind: "company",
    companyId: moduleCompanyB,
  });
});

it("vuelve al selector explícito y elimina el contexto al cambiar de identidad", () => {
  const { result, rerender } = renderHook(
    (context) => useCompanyContext(context),
    { initialProps: moduleContext },
  );
  act(() => result.current.selectCompany("all"));
  expect(navigation.replace).toHaveBeenLastCalledWith(
    "/empresas?module=tributario",
  );
  navigation.pathname = "/empresas";
  navigation.parameters = new URLSearchParams("module=tributario");
  rerender(moduleContext);
  expect(result.current.company).toEqual({ kind: "all" });
  navigation.pathname = "/documentos";
  navigation.parameters = new URLSearchParams();
  rerender({
    ...moduleContext,
    profile: { ...moduleContext.profile, user_id: moduleCompanyB },
  });
  expect(result.current.company).toEqual({ kind: "all" });
});
