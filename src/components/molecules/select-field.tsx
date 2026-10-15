import { Label } from "@/components/atoms/label";
import { Select } from "@/components/atoms/select";
import type { SelectFieldProps } from "@/components/types/control.types";

export function SelectField({
  label,
  id,
  children,
  ...props
}: SelectFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select {...props} id={id}>
        {children}
      </Select>
    </div>
  );
}
