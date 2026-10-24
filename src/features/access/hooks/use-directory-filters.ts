"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { ListFilter } from "@/domain/access/types/access.types";
import { presentationPage } from "@/features/access/utils/presentation-page";

export function useDirectoryFilters() {
  const parameters = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filter: ListFilter = {
    page: presentationPage(parameters.get("page")),
    query: (parameters.get("q") ?? "").slice(0, 200),
    deleted: parameters.get("deleted") === "true",
  };
  function setFilter(value: ListFilter) {
    const next = new URLSearchParams(parameters.toString());
    next.set("page", String(value.page));
    next.set("q", value.query);
    next.set("deleted", String(value.deleted));
    next.delete("memberId");
    router.replace(`${pathname}?${next}`, { scroll: false });
  }
  return [filter, setFilter] as const;
}
