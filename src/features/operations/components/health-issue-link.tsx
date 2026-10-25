import Link from "next/link";

import type { HealthIssueLinkProps } from "@/features/operations/types/health-evaluation.types";
import { healthIssueAction } from "@/features/operations/utils/health-issue-action";

export function HealthIssueLink({ issue }: HealthIssueLinkProps) {
  const action = healthIssueAction(issue.code);
  if (!action) return null;
  return (
    <Link
      className="inline-flex min-h-11 items-center px-2 text-xs font-medium underline underline-offset-4 focus-visible:outline-2"
      href={action.href}
    >
      {action.label} →
    </Link>
  );
}
