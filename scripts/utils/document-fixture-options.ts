import { z } from "zod";

import { DOCUMENT_MODULES } from "../../src/domain/documents/constants/engine";

const optionsSchema = z
  .object({
    module: z.enum([...DOCUMENT_MODULES, "actividades"]).default("tributario"),
    "employment-period-id": z.uuid().optional(),
    "company-id": z.uuid().optional(),
    "obligation-id": z.uuid().optional(),
    "delivery-role": z.enum(["cliente", "contador"]).default("cliente"),
  })
  .strict();
export function readDocumentFixtureOptions(argumentsList: string[]) {
  if (argumentsList.length % 2)
    throw new Error("Opciones de recorrido documental incompletas.");
  const entries = Array.from(
    { length: argumentsList.length / 2 },
    (_, index) => [
      argumentsList[index * 2].replace(/^--/, ""),
      argumentsList[index * 2 + 1],
    ],
  );
  const options = optionsSchema.parse(Object.fromEntries(entries));
  if (options.module === "actividades" && !options["obligation-id"])
    throw new Error(
      "Actividades requiere una obligación adicional local existente.",
    );
  if (
    options.module === "laboral_trabajador" &&
    !options["employment-period-id"]
  )
    throw new Error(
      "El recorrido por trabajador requiere una etapa local explícita.",
    );
  return options;
}
