import { FOCUS_RING } from "@/components/constants/control-styles";
import type { CheckboxFieldProps } from "@/components/types/control.types";

export function CheckboxField({ label, id, ...props }: CheckboxFieldProps) {
  return (
    <label
      className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"
      htmlFor={id}
    >
      <input
        {...props}
        className={`size-4 accent-zinc-950 ${FOCUS_RING}`}
        id={id}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
}
