"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const positions = new Map<string, number>();
let identity = "";

export function useScrollRestoration(scope: string) {
  const pathname = usePathname();
  const parameters = useSearchParams();
  const route = `${pathname}?${parameters}`;
  const key = `${scope}:${route}`;
  useEffect(() => {
    if (identity !== scope) {
      positions.clear();
      identity = scope;
    }
    const target = positions.get(key) ?? 0;
    let restoring = target > 0;
    const restore = () => {
      if (
        !restoring ||
        document.documentElement.scrollHeight < target + innerHeight
      )
        return;
      window.scrollTo(0, target);
      restoring = false;
    };
    const observer = new ResizeObserver(restore);
    observer.observe(document.body);
    const save = () => {
      const current = `${location.pathname}?${new URLSearchParams(location.search)}`;
      // Next can scroll after changing the URL but before this effect cleans up.
      if (!restoring && current === route) positions.set(key, window.scrollY);
    };
    const cancel = () => {
      restoring = false;
    };
    window.addEventListener("scroll", save, { passive: true });
    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("touchstart", cancel, { passive: true });
    restore();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", save);
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
    };
  }, [key, route, scope]);
}
