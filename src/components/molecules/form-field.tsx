import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import type { FormFieldProps } from "@/components/types/control.types";

export function FormField({
  error,
  hint,
  id,
  label,
  ...props
}: FormFieldProps) {
  const hintId = hint ? id + "-hint" : undefined;
  const errorId = error ? id + "-error" : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        {...props}
        aria-describedby={describedBy}
        id={id}
        invalid={Boolean(error)}
      />
      {hint && (
        <p className="text-sm text-zinc-600" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-800" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
