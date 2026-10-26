import type { HealthIssueAction } from "@/features/operations/types/health-evaluation.types";

export function healthIssueAction(code: string): HealthIssueAction | null {
  if (code.startsWith("WHATSAPP") || code.startsWith("DIGESTS"))
    return { href: "/configuracion?tab=whatsapp", label: "Revisar WhatsApp" };
  if (code.startsWith("GENERATION"))
    return { href: "/configuracion?tab=reglas", label: "Revisar entregables" };
  if (code === "INVALID_RESPONSIBLES")
    return {
      href: "/configuracion?tab=responsables",
      label: "Revisar responsables",
    };
  if (code === "UPLOAD_STALLED")
    return { href: "/documentos", label: "Consultar documentos" };
  return null;
}
