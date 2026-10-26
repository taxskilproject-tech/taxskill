import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { SelectField } from "@/components/molecules/select-field";
import { DOCUMENT_STATES } from "@/features/document-workspace/constants/documents";
import type { DocumentResultsHeadingProps } from "@/features/document-workspace/types/document-workspace-ui.types";

export function DocumentResultsHeading({
  group,
  navigation,
}: DocumentResultsHeadingProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <header className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2
          className="sr-only text-base font-semibold lg:not-sr-only"
          id="document-document-heading"
        >
          {group?.name ?? "Documento no disponible"}
        </h2>
        <p className="text-xs text-slate-600">
          {group?.count ?? 0}{" "}
          {group?.count === 1 ? "obligación" : "obligaciones"} ·{" "}
          {group?.approved_files ?? 0}/{group?.total_files ?? 0} archivos
          aprobados
        </p>
      </div>
      <Button
        variant="secondary"
        className="lg:hidden"
        aria-controls="document-state-filter"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        Estado{navigation.state ? " · 1" : ""} <span aria-hidden="true">⌄</span>
      </Button>
      <div
        id="document-state-filter"
        className={`${expanded ? "block" : "hidden"} w-full lg:block lg:w-auto`}
      >
        <SelectField
          id="document-state"
          label="Estado"
          value={navigation.state}
          onChange={(event) =>
            navigation.select("documentState", event.target.value)
          }
        >
          {DOCUMENT_STATES.map((state) => (
            <option key={state.value} value={state.value}>
              {state.label}
            </option>
          ))}
        </SelectField>
      </div>
    </header>
  );
}
