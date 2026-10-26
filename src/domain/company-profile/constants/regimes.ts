export const TAX_REGIMES = [
  { code: "nuevo_rus", label: "Nuevo RUS" },
  { code: "rer", label: "RER - Régimen Especial de Renta" },
  { code: "mype", label: "MYPE - Régimen Mype Tributario" },
  { code: "rg", label: "RG - Régimen General" },
  { code: "renta_4ta", label: "4ta Categoría" },
  { code: "renta_1ra", label: "1ra Categoría" },
  { code: "renta_2da", label: "2da Categoría" },
  { code: "renta_5ta", label: "5ta Categoría" },
] as const;

export const HEALTH_COVERAGES = [
  { value: "sis", label: "SIS" },
  { value: "essalud", label: "EsSalud" },
  { value: "none", label: "Sin entregables de seguro" },
] as const;

export const APPLICABILITY_LABELS = {
  always: "Cuando se habilita el módulo",
  plame: "Con PLAME",
  afp: "Con PLAME y AFP",
  sis: "Con cobertura SIS",
  essalud: "Con cobertura EsSalud",
};
