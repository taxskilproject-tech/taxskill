"use client";
import { useState } from "react";

import { FormField } from "@/components/molecules/form-field";
import type { FileSizeFieldProps } from "@/features/documents/types/file-size.types";
import {
  BYTES_PER_MB,
  megabytesToBytes,
} from "@/features/documents/utils/file-size";

export function FileSizeField({
  id,
  name,
  label,
  maximum,
  value,
  defaultValue,
  onChange,
}: FileSizeFieldProps) {
  const [local, setLocal] = useState(defaultValue ?? maximum);
  const bytes = value ?? local;
  return (
    <>
      <FormField
        id={id}
        label={`${label} (MB)`}
        max={maximum / BYTES_PER_MB}
        min={1 / BYTES_PER_MB}
        step="0.000001"
        required
        type="number"
        value={bytes ? bytes / BYTES_PER_MB : ""}
        onChange={(event) => {
          const next = megabytesToBytes(event.target.value);
          setLocal(next);
          onChange?.(next);
        }}
      />
      <input name={name} type="hidden" value={bytes} />
    </>
  );
}
