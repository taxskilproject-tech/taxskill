import { z } from "zod";

export const sunatDetailReadEffectSchema = z.object({
  updateLeido: z.boolean().optional(),
});

const integer = z
  .union([z.number(), z.string().regex(/^\d+$/)])
  .transform(Number)
  .pipe(z.number().int().nonnegative().safe());

export const sunatPagePayloadSchema = z.object({
  page: integer.refine((value) => value >= 1).nullish(),
  startPage: integer,
  endPage: integer,
  total: integer,
  records: integer,
  rows: z
    .array(
      z.object({
        codMensaje: z
          .union([
            z.string().regex(/^\d{1,30}$/),
            z.number().int().nonnegative().safe(),
          ])
          .transform(String),
        desAsunto: z.string().max(10000),
        fecPublica: z.string().max(80),
        indEstado: integer,
        indTipmsj: integer,
        cantidadArchAdj: integer,
      }),
    )
    .max(25),
});
