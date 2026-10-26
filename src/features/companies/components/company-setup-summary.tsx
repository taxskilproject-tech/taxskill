import Link from "next/link";

import { Button } from "@/components/atoms/button";
import { parseChecklist } from "@/domain/company-profile/utils/profile";
import type { CompanySetupSummaryProps } from "@/features/companies/types/company-setup.types";
import { TemplatePreview } from "@/features/deliverable-templates/components/template-preview";

export function CompanySetupSummary({
  items,
  profile,
  version,
  refreshing,
  onRefresh,
}: CompanySetupSummaryProps) {
  const parsed = parseChecklist(profile);
  if (!parsed.success)
    return (
      <p className="text-sm text-amber-800">
        Completa los módulos y la cobertura antes de confirmar.
      </p>
    );
  return (
    <div className="space-y-3">
      {!items ? (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p>
            Este régimen necesita una plantilla publicada. Completa sus
            entregables, frecuencias y plazos antes de guardar.
          </p>
          <Link
            href="/configuracion?tab=plantillas"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center text-blue-800 underline"
          >
            Abrir plantillas en otra pestaña
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm font-medium">
            Plantilla publicada · versión {version}
          </p>
          <TemplatePreview items={items} profile={parsed.data} />
          <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            Después de crear la empresa, asigna accesos y responsables por
            módulo. Hasta entonces los entregables no generarán obligaciones ni
            avisos.
          </p>
        </>
      )}
      <Button
        variant="secondary"
        loading={refreshing}
        loadingText="Consultando plantilla…"
        onClick={onRefresh}
      >
        Actualizar plantilla disponible
      </Button>
    </div>
  );
}
