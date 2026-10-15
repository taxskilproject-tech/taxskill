import { FEEDBACK_STYLES } from "@/components/constants/control-styles";
import type { FeedbackMessageProps } from "@/components/types/control.types";

export function FeedbackMessage({
  children,
  id,
  kind = "info",
}: FeedbackMessageProps) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm leading-6 ${FEEDBACK_STYLES[kind]}`}
      id={id}
      role={kind === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
