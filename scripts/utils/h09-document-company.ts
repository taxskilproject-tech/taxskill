import { readFileSync } from "node:fs";
import { z } from "zod";

export function h09DocumentCompany() {
  const fixture = z
    .object({
      companies: z.array(z.object({ company_id: z.uuid(), name: z.string() })),
    })
    .parse(
      JSON.parse(readFileSync("test-results/local/h09-lab/demo.json", "utf8")),
    );
  const company = fixture.companies.find(
    (item) => item.name === "H09 · Tributario · pendiente",
  );
  if (!company)
    throw new Error(
      "Prepara primero la empresa ficticia con el comando seed de H09.",
    );
  return company.company_id;
}
