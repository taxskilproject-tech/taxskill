import { FormField } from "@/components/molecules/form-field";
import { SelectField } from "@/components/molecules/select-field";
import { IDENTITY_TYPES } from "@/domain/workers/constants/workers";
import type { WorkerFieldsProps } from "@/features/workers/types/worker-ui.types";

export function WorkerFields({ worker }: WorkerFieldsProps) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3 text-sm font-semibold">
        Identificación y contacto
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          defaultValue={worker?.identity_type ?? "DNI"}
          id="worker-identity-type"
          label="Tipo de identificación"
          name="identity_type"
        >
          {IDENTITY_TYPES.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </SelectField>
        <FormField
          defaultValue={worker?.identity_number}
          id="worker-identity-number"
          label="Número de identificación"
          maxLength={40}
          name="identity_number"
          required
        />
        <FormField
          defaultValue={worker?.first_names}
          id="worker-first-names"
          label="Nombres"
          maxLength={150}
          name="first_names"
          required
        />
        <FormField
          defaultValue={worker?.last_names}
          id="worker-last-names"
          label="Apellidos"
          maxLength={150}
          name="last_names"
          required
        />
        <FormField
          defaultValue={worker?.birth_date ?? ""}
          id="worker-birth"
          label="Fecha de nacimiento (opcional)"
          name="birth_date"
          type="date"
        />
        <FormField
          defaultValue={worker?.email ?? ""}
          id="worker-email"
          label="Correo (opcional)"
          maxLength={254}
          name="email"
          type="email"
        />
        <FormField
          defaultValue={worker?.phone ?? ""}
          id="worker-phone"
          label="Teléfono (opcional)"
          maxLength={40}
          name="phone"
          type="tel"
        />
        <FormField
          defaultValue={worker?.address ?? ""}
          id="worker-address"
          label="Dirección (opcional)"
          maxLength={500}
          name="address"
        />
      </div>
      <FormField
        defaultValue={worker?.notes ?? ""}
        id="worker-notes"
        label="Notas de la ficha (opcional)"
        maxLength={2000}
        name="notes"
      />
    </fieldset>
  );
}
