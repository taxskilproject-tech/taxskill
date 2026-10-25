"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function usePresentation(
  name: string,
  fallback: string,
  allowed?: readonly string[],
) {
  const parameters = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const requested = parameters.get(name);
  const selected =
    requested && (!allowed || allowed.includes(requested))
      ? requested
      : fallback;
  function select(value: string) {
    const next = new URLSearchParams(parameters.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    if (name.startsWith("worker") && name !== "workerPage")
      next.delete("workerPage");
    if (name.startsWith("obligation") && name !== "obligationPage")
      next.delete("obligationPage");
    if (name.startsWith("catalog") && name !== "catalogPage")
      next.delete("catalogPage");
    if (name.startsWith("rules") && name !== "rulesPage")
      next.delete("rulesPage");
    router.replace(`${pathname}?${next}`, { scroll: false });
  }
  return [selected, select] as const;
}
