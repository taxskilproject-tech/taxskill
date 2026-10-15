// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { success } from "@/domain/common/utils/operation-result";
import { useAction } from "@/features/access/hooks/use-action";

afterEach(cleanup);
it("bloquea dobles ejecuciones y expone progreso hasta terminar", async () => {
  const pending = Promise.withResolvers<ReturnType<typeof success<null>>>();
  const work = vi.fn(() => pending.promise);
  const { result } = renderHook(() => useAction<null>());
  let running: Promise<boolean>;
  act(() => {
    running = result.current.run(work);
  });
  expect(result.current.busy).toBe(true);
  expect(await result.current.run(work)).toBe(false);
  expect(work).toHaveBeenCalledTimes(1);
  await act(async () => {
    pending.resolve(success(null));
    await running;
  });
  expect(result.current.busy).toBe(false);
});
it("muestra fallos explícitos y permite reintentar", async () => {
  const { result } = renderHook(() => useAction<null>());
  const reject = () => Promise.reject(new Error("sensitive provider text"));
  const resolve = () => Promise.resolve(success(null));
  await act(async () => {
    await result.current.run(reject);
  });
  expect(result.current.error).toBeTruthy();
  expect(result.current.error).not.toContain("sensitive");
  await act(async () => {
    await result.current.run(resolve);
  });
  expect(result.current.error).toBeNull();
});
