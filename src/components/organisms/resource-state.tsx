import { Spinner } from "@/components/atoms/spinner";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import type { ResourceStateProps } from "@/components/types/control.types";

export function ResourceState({
  action,
  description,
  kind,
  title,
}: ResourceStateProps) {
  const isError = kind === "error" || kind === "conflict";

  return (
    <section
      aria-busy={kind === "loading" || undefined}
      className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-6"
    >
      <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-950">
        {kind === "loading" && <Spinner />}
        {title}
      </h2>
      <FeedbackMessage kind={isError ? "error" : "info"}>
        {description}
      </FeedbackMessage>
      {action && <div>{action}</div>}
    </section>
  );
}
