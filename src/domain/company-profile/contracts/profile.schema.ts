import { z } from "zod";

export const taxRegimeSchema = z.enum([
  "nuevo_rus",
  "rer",
  "mype",
  "rg",
  "renta_4ta",
  "renta_1ra",
  "renta_2da",
  "renta_5ta",
]);
export const documentaryProfileSchema = z
  .object({
    schema_version: z.literal(1),
    plame: z.boolean(),
    afp: z.boolean(),
    igv_renta: z.boolean(),
    health_coverage: z.enum(["none", "sis", "essalud"]),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.plame && !value.igv_renta)
      context.addIssue({
        code: "custom",
        path: ["igv_renta"],
        message: "Habilita PLAME o IGV renta para continuar.",
      });
    if (value.afp && !value.plame)
      context.addIssue({
        code: "custom",
        path: ["afp"],
        message: "AFP requiere PLAME.",
      });
    if (!value.plame && value.health_coverage !== "none")
      context.addIssue({
        code: "custom",
        path: ["health_coverage"],
        message: "La cobertura laboral requiere PLAME.",
      });
  });
