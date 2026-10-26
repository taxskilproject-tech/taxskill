import { CheckboxField } from "@/components/molecules/checkbox-field";
import { SelectField } from "@/components/molecules/select-field";
import { HEALTH_COVERAGES } from "@/domain/company-profile/constants/regimes";
import type { CompanyChecklistProps } from "@/features/deliverable-templates/types/template-ui.types";

export function CompanyChecklist({
  value,
  onChange,
  disabled,
}: CompanyChecklistProps) {
  return (
    <fieldset
      disabled={disabled}
      className="space-y-4 rounded-xl border border-slate-200 p-4"
    >
      <legend className="px-2 font-semibold">Módulos y cobertura</legend>
      <CheckboxField
        id="profile-igv"
        name="profile_igv_renta"
        label="IGV renta · habilitar Tributario"
        checked={value.igv_renta}
        onChange={(event) =>
          onChange({ ...value, igv_renta: event.target.checked })
        }
      />
      <CheckboxField
        id="profile-plame"
        name="profile_plame"
        label="PLAME · habilitar ambos módulos laborales"
        checked={value.plame}
        onChange={(event) =>
          onChange({
            ...value,
            plame: event.target.checked,
            afp: event.target.checked ? value.afp : false,
            health_coverage: "",
          })
        }
      />
      <CheckboxField
        id="profile-afp"
        name="profile_afp"
        label="AFP · incluir Planilla AFP y Pago AFP"
        checked={value.afp}
        disabled={!value.plame}
        onChange={(event) => onChange({ ...value, afp: event.target.checked })}
      />
      <p className="text-xs text-slate-600">
        AFP requiere PLAME. Desactivar PLAME limpia AFP y la cobertura laboral.
      </p>
      {value.plame && (
        <SelectField
          id="profile-health"
          name="profile_health_coverage"
          label="Cobertura laboral"
          value={value.health_coverage}
          required
          onChange={(event) => {
            const coverage = HEALTH_COVERAGES.find(
              (item) => item.value === event.target.value,
            );
            if (coverage)
              onChange({ ...value, health_coverage: coverage.value });
          }}
        >
          <option value="">Seleccionar cobertura</option>
          {HEALTH_COVERAGES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </SelectField>
      )}
      <p className="text-sm text-slate-600">
        Selecciona PLAME o IGV renta. Estos controles determinan los entregables
        aplicables, sin conceder permisos.
      </p>
    </fieldset>
  );
}
