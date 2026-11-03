"use client";
import type { FormEvent } from "react";

import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { FilterDisclosure } from "@/components/molecules/filter-disclosure";
import { SelectField } from "@/components/molecules/select-field";

import type { SunatFilterProps } from "../types/ui.types";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const MAILBOXES = [
  { id: "messages", label: "Mensajes" },
  { id: "notifications", label: "Notificaciones" },
];

export function SunatMailboxFilters({
  filters,
  onChange,
  action,
}: SunatFilterProps) {
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    onChange({ q: String(values.get("q") ?? "") });
  }
  return (
    <div className="space-y-3">
      <nav
        aria-label="Bandejas del Buzón SUNAT"
        className="flex flex-wrap gap-2"
      >
        {MAILBOXES.map(({ id, label }) => (
          <Button
            key={id}
            aria-current={filters.mailbox === id ? "page" : undefined}
            variant={filters.mailbox === id ? "primary" : "secondary"}
            onClick={() => {
              if (filters.mailbox !== id) onChange({ mailbox: id, q: "" });
            }}
          >
            {label}
          </Button>
        ))}
      </nav>
      <div className="grid grid-cols-2 items-end gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:grid-cols-[8rem_12rem_minmax(0,1fr)]">
        <SelectField
          id="sunat-year"
          label="Año"
          value={filters.year}
          onChange={(event) => onChange({ year: event.target.value })}
        >
          {Array.from(
            { length: filters.year - 1988 },
            (_, index) => filters.year + 1 - index,
          )
            .filter((year) => year >= 1990 && year <= 2200)
            .map((year) => (
              <option value={year} key={year}>
                {year}
              </option>
            ))}
        </SelectField>
        <SelectField
          id="sunat-month"
          label="Mes de publicación"
          value={filters.month}
          onChange={(event) => onChange({ month: event.target.value })}
        >
          {MONTHS.map((name, index) => (
            <option value={index + 1} key={name}>
              {name}
            </option>
          ))}
        </SelectField>
        <div className="col-span-2 flex items-start gap-2 lg:col-span-1">
          <div className="min-w-0 flex-1">
            <FilterDisclosure
              label="Buscar por asunto"
              count={Number(Boolean(filters.q))}
            >
              <form
                onSubmit={search}
                className="mt-3 flex gap-2"
                key={filters.q}
              >
                <label className="sr-only" htmlFor="sunat-subject-search">
                  Buscar por asunto
                </label>
                <Input
                  id="sunat-subject-search"
                  name="q"
                  defaultValue={filters.q}
                  placeholder="Buscar por asunto"
                  maxLength={150}
                />
                <Button type="submit" variant="secondary">
                  Buscar
                </Button>
              </form>
            </FilterDisclosure>
          </div>
          {action}
        </div>
      </div>
    </div>
  );
}
