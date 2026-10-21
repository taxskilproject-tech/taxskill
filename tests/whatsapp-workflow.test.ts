import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { z } from "zod";

const workflowSchema = z.object({
  nodes: z.array(
    z.object({
      name: z.string(),
      parameters: z.record(z.string(), z.unknown()),
    }),
  ),
});

it("conserva el nombre exacto autorizado de TI y el envío mediante credencial", () => {
  const workflow = workflowSchema.parse(
    JSON.parse(
      readFileSync(
        "integrations/n8n/produccion/taxskill-whatsapp-evolution.workflow.json",
        "utf8",
      ),
    ),
  );
  const node = workflow.nodes.find((item) => item.name === "Evolution API");
  expect(node?.parameters.url).toBe(
    "https://n8n-evolution-api.ricijy.easypanel.host/message/sendText/%20TI",
  );
  expect(node?.parameters.authentication).toBe("genericCredentialType");
  expect(JSON.stringify(node?.parameters)).not.toContain('"apikey"');
});
