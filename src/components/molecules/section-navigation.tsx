"use client";

import { useId } from "react";

import { Button } from "@/components/atoms/button";
import { SelectField } from "@/components/molecules/select-field";
import type { SectionNavigationProps } from "@/components/types/layout.types";

export function SectionNavigation({
  label,
  items,
  selected,
  onSelect,
}: SectionNavigationProps) {
  const id = useId();
  return (
    <>
      <div className="sm:hidden">
        <SelectField
          id={id}
          label={label}
          value={selected}
          onChange={(event) => onSelect(event.target.value)}
        >
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </SelectField>
      </div>
      <nav
        aria-label={label}
        className="hidden flex-wrap gap-1 border-b border-zinc-200 pb-2 sm:flex"
      >
        {items.map((item) => (
          <Button
            aria-current={item.id === selected ? "page" : undefined}
            key={item.id}
            onClick={() => onSelect(item.id)}
            variant={item.id === selected ? "primary" : "secondary"}
          >
            {item.label}
          </Button>
        ))}
      </nav>
    </>
  );
}
