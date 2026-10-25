import { Spinner } from "@/components/atoms/spinner";
import {
  BUTTON_VARIANTS,
  FOCUS_RING,
} from "@/components/constants/control-styles";
import type { ButtonProps } from "@/components/types/control.types";

export function Button({
  children,
  className = "",
  disabled,
  loading = false,
  loadingText = "Procesando…",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING} ${BUTTON_VARIANTS[variant]} ${className}`}
      disabled={disabled || loading}
      type={type}
    >
      {loading && <Spinner />}
      {loading ? loadingText : children}
    </button>
  );
}
