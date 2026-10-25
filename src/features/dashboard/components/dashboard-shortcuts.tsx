"use client";
import Link from "next/link";

import { Icon } from "@/components/atoms/icon";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { canReviewScope } from "@/features/auth/utils/review-access";

export function DashboardShortcuts() {
  const { context, company } = useWorkspace();
  return (
    <nav
      aria-label="Accesos al trabajo"
      className="flex flex-wrap gap-2 text-sm"
    >
      <Link
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 font-medium text-blue-800 hover:bg-blue-100 focus-visible:outline-2"
        href="/actividades?group=mine"
      >
        <Icon name="activity" />
        Mis entregas
      </Link>
      <Link
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 font-medium text-red-800 hover:bg-red-50 focus-visible:outline-2"
        href="/actividades?group=overdue"
      >
        Vencidas <Icon name="arrow" />
      </Link>
      {canReviewScope(context, company) && (
        <Link
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 font-medium text-blue-800 hover:bg-blue-50 focus-visible:outline-2"
          href="/actividades?group=review"
        >
          Por revisar <Icon name="arrow" />
        </Link>
      )}
    </nav>
  );
}
