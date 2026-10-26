import { Button } from "@/components/atoms/button";
import { SelectField } from "@/components/molecules/select-field";
import type { DocumentTypeNavigationProps } from "@/features/document-workspace/types/document-workspace-ui.types";

export function DocumentTypeNavigation({
  groups,
  selected,
  onSelect,
  periodSummary,
}: DocumentTypeNavigationProps) {
  return (
    <>
      <div
        className={`grid min-w-0 gap-2 lg:hidden ${periodSummary ? "grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]" : "grid-cols-1"}`}
      >
        {periodSummary}
        <SelectField
          id="document-document-mobile"
          label="Tipo de documento"
          value={selected}
          onChange={(event) => onSelect(event.target.value)}
        >
          {!groups.some((group) => group.code === selected) && (
            <option value={selected}>Seleccionar documento</option>
          )}
          {groups.map((group, index) => (
            <option key={group.code} value={group.code}>
              {index + 1}. {group.name} · {group.count}
            </option>
          ))}
        </SelectField>
      </div>
      <nav
        aria-label="Tipos documentales en orden"
        className="hidden space-y-1 lg:block"
      >
        {groups.map((group, index) => (
          <Button
            key={group.code}
            aria-pressed={selected === group.code}
            className="w-full justify-start gap-2 px-3 text-left"
            onClick={() => onSelect(group.code)}
            variant={selected === group.code ? "primary" : "secondary"}
          >
            <span className="shrink-0 text-xs opacity-75">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0 flex-1">{group.name}</span>
            <span className="shrink-0 text-xs">{group.count}</span>
          </Button>
        ))}
      </nav>
    </>
  );
}
