"use client";

import { usePathname, useSearchParams } from "next/navigation";

export function useCurrentRoute() {
  const pathname = usePathname();
  const parameters = useSearchParams();
  return pathname + (parameters.size ? `?${parameters}` : "");
}
