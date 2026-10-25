"use client";

import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { SidePanel } from "@/components/organisms/side-panel";
import type { RecordInspectorProps } from "@/components/types/inspector.types";

export function RecordInspector({
  title,
  label = "Ver detalle",
  children,
}: RecordInspectorProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}: ${title}`}
        onClick={() => setOpen(true)}
        variant="secondary"
        className="shrink-0 px-2"
      >
        <span className="hidden sm:inline">{label}</span>
        <Icon name="arrow" />
      </Button>
      {open && (
        <SidePanel title={title} onClose={() => setOpen(false)}>
          {children}
        </SidePanel>
      )}
    </>
  );
}
