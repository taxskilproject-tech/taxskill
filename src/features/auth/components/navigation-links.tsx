import Link from "next/link";

import type { NavigationLinksProps } from "@/features/auth/types/navigation.types";

export function NavigationLinks({
  items,
  active,
  onNavigate,
  centered = false,
}: NavigationLinksProps) {
  return (
    <>
      {items.map((item) => (
        <Link
          aria-current={item.id === active ? "page" : undefined}
          className={`flex min-h-11 items-center rounded-lg px-3 text-sm focus-visible:outline-2 ${centered ? "justify-center" : "justify-start"} ${item.id === active ? "bg-zinc-950 font-medium text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
          href={item.href}
          key={item.id}
          onClick={onNavigate}
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}
