import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";

import { requireLocalTestEnvironment } from "./utils/require-local-test-environment";

requireLocalTestEnvironment();
const baseUrl = "http://127.0.0.1:5679/rest";
const ownerPath = "test-results/local/h06-runtime/n8n-owner.json";
const ownerSchema = z.object({ email: z.email(), password: z.string() });
const owner = existsSync(ownerPath)
  ? ownerSchema.parse(JSON.parse(readFileSync(ownerPath, "utf8")))
  : {
      email: "h06-owner@example.test",
      password: `H06!${randomBytes(24).toString("hex")}`,
    };
writeFileSync(ownerPath, JSON.stringify(owner));
let cookie = "";
async function request(path: string, method: string, body?: unknown) {
  return fetch(baseUrl + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: "http://127.0.0.1:5679",
      Cookie: cookie,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
}
async function main() {
  let auth = await request("/login", "POST", {
    emailOrLdapLoginId: owner.email,
    password: owner.password,
  });
  if (!auth.ok)
    auth = await request("/owner/setup", "POST", {
      ...owner,
      firstName: "H06",
      lastName: "Local",
    });
  if (!auth.ok)
    throw new Error(`n8n local authentication: HTTP ${auth.status}`);
  cookie = auth.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  if (!cookie) throw new Error("n8n local did not return a session cookie");
  const workflow = z
    .object({
      id: z.string(),
      name: z.string(),
      nodes: z.array(z.record(z.string(), z.unknown())),
      connections: z.record(z.string(), z.unknown()),
      settings: z.record(z.string(), z.unknown()),
    })
    .parse(
      JSON.parse(
        readFileSync("test-results/local/h06-runtime/workflow.json", "utf8"),
      ),
    );
  const saved = await request(
    `/workflows/${workflow.id}?forceSave=true`,
    "PATCH",
    {
      ...workflow,
      nodes: workflow.nodes.map((node) => ({
        ...node,
        notes: "H06: servicio local de prueba, sin destinatarios reales.",
      })),
    },
  );
  if (!saved.ok) throw new Error(`n8n local save: HTTP ${saved.status}`);
  const version = z
    .object({ data: z.object({ versionId: z.string() }) })
    .parse(await saved.json());
  const published = await request(
    `/workflows/${workflow.id}/activate`,
    "POST",
    { versionId: version.data.versionId },
  );
  if (!published.ok)
    throw new Error(`n8n local publish: HTTP ${published.status}`);
  console.info(
    "Workflow H06 guardado y publicado en n8n Docker local. No se imprimen credenciales.",
  );
}
main().catch((cause: unknown) => {
  console.error(
    cause instanceof Error ? cause.message : "n8n local setup failed",
  );
  process.exitCode = 1;
});
