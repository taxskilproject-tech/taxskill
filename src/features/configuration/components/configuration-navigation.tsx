"use client";
import { Button } from "@/components/atoms/button";
import { SelectField } from "@/components/molecules/select-field";
import type { SectionNavigationProps } from "@/components/types/layout.types";
import { CONFIGURATION_SECTIONS } from "@/features/configuration/constants/sections";

export function ConfigurationNavigation({
  selected,
  onSelect,
}: Pick<SectionNavigationProps, "selected" | "onSelect">) {
  return (
    <>
      <div className="xl:hidden">
        <SelectField
          id="configuration-section"
          label="Sección de configuración"
          value={selected}
          onChange={(event) => onSelect(event.target.value)}
        >
          {CONFIGURATION_SECTIONS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.group} · {item.label}
            </option>
          ))}
        </SelectField>
      </div>
      <nav
        aria-label="Secciones de configuración"
        className="hidden space-y-5 xl:block"
      >
        {[
          "Documentación",
          "Accesos",
          "Estudio",
          "Integraciones",
          "Sistema",
        ].map((group) => (
          <div className="space-y-1" key={group}>
            <p className="px-2 text-xs font-medium text-zinc-500">{group}</p>
            {CONFIGURATION_SECTIONS.filter((item) => item.group === group).map(
              (item) => (
                <Button
                  aria-current={item.id === selected ? "page" : undefined}
                  className="w-full justify-start px-2 text-left"
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  variant={item.id === selected ? "primary" : "secondary"}
                >
                  {item.label}
                </Button>
              ),
            )}
          </div>
        ))}
      </nav>
    </>
  );
}
