import Link from "next/link";

import { Icon } from "@/components/atoms/icon";
import {
  DARK_MODULE_ICON_STYLES,
  MODULE_ICON_STYLES,
  NAVIGATION_ICONS,
} from "@/features/auth/constants/navigation-visuals";
import type { NavigationLinksProps } from "@/features/auth/types/navigation.types";

export function NavigationLinks({
  items,
  active,
  onNavigate,
  centered = false,
  dark = false,
}: NavigationLinksProps) {
  return (
    <>
      {items.map((item) => (
        <Link
          aria-current={item.id === active ? "page" : undefined}
          className={`flex min-h-11 gap-2 rounded-lg px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${dark ? "focus-visible:outline-blue-400" : "focus-visible:outline-blue-600"} ${centered ? "flex-col items-center justify-center gap-0 py-1 text-xs" : "items-center"} ${item.id === active ? "bg-blue-700 font-semibold text-white" : dark ? "text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:bg-blue-50"}`}
          href={item.href}
          key={item.id}
          onClick={onNavigate}
        >
          <Icon
            name={NAVIGATION_ICONS[item.id]}
            className={
              item.id === active
                ? ""
                : (dark ? DARK_MODULE_ICON_STYLES : MODULE_ICON_STYLES)[item.id]
            }
          />
          <span>{item.label}</span>
          {onNavigate && !centered && (
            <Icon name="arrow" className="ml-auto h-4 w-4 text-slate-400" />
          )}
        </Link>
      ))}
    </>
  );
}
