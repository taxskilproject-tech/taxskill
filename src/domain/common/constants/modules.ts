import type { ModuleDefinition } from "@/domain/common/types/module.types";

export const DOCUMENT_MODULES: readonly ModuleDefinition[] = [
  {
    id: "tributario",
    name: "Tributario",
    description: "Obligaciones y documentación tributaria por empresa.",
  },
  {
    id: "laboral_trabajador",
    name: "Laboral por trabajador",
    description: "Expediente documental de cada etapa laboral.",
  },
  {
    id: "laboral_general",
    name: "Laboral general",
    description: "Documentación colectiva y periódica de la empresa.",
  },
  {
    id: "actividades",
    name: "Actividades",
    description: "Entregas pendientes y actividades adicionales del estudio.",
  },
];
