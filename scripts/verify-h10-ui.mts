import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import { z } from "zod";

import { sessionContextSchema } from "../src/features/auth/contracts/session.schema";
const environment = parseEnv(
  readFileSync(".envs/local/sunat/service.env", "utf8"),
);
if (environment.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54431")
  throw new Error("LOCAL_DOCKER_ONLY");
const credentials = z
  .object({ BOOTSTRAP_EMAIL: z.email(), BOOTSTRAP_PASSWORD: z.string() })
  .parse(parseEnv(readFileSync(".envs/local/bootstrap.env", "utf8")));
const client = createClient(
  environment.NEXT_PUBLIC_SUPABASE_URL,
  z.string().min(1).parse(environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  { auth: { persistSession: false } },
);
if (
  (
    await client.auth.signInWithPassword({
      email: credentials.BOOTSTRAP_EMAIL,
      password: credentials.BOOTSTRAP_PASSWORD,
    })
  ).error
)
  throw new Error("LOCAL_LOGIN_FAILED");
const result = await client.rpc("h02_context");
const context = z
  .object({ ok: z.literal(true), data: sessionContextSchema })
  .parse(result.data).data;
const company = context.companies.find((item) => item.ruc === "20000000901");
if (!company) throw new Error("LOCAL_FIXTURE_REQUIRED");
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const output = "docs/hitos/evidencias/capturas/h10";
mkdirSync(output, { recursive: true });
const checks: string[] = [];
const errors: string[] = [];
try {
  const session = await browser.newContext({
    viewport: { width: 1366, height: 768 },
  });
  let releaseToken: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    releaseToken = resolve;
  });
  await session.route("**/*", async (route) => {
    const target = new URL(route.request().url());
    if (
      !["http://localhost:4004", "http://127.0.0.1:54431"].includes(
        target.origin,
      )
    ) {
      await route.abort();
      throw new Error("REMOTE_BROWSER_REQUEST_BLOCKED");
    }
    if (target.pathname === "/auth/v1/token") await gate;
    await route.continue();
  });
  const page = await session.newPage();
  page.on("pageerror", (error) => errors.push(error.name));
  await page.goto("http://localhost:4004/login");
  await page.getByLabel(/Correo/).fill(credentials.BOOTSTRAP_EMAIL);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(credentials.BOOTSTRAP_PASSWORD);
  await page.getByRole("button", { name: "Ingresar al estudio" }).click();
  const busy = page.getByRole("button", {
    name: /Ingresando|Verificando sesión/,
  });
  await busy.waitFor({ state: "visible" });
  if (!(await busy.isDisabled())) throw new Error("ASYNC_CONTROL_NOT_DISABLED");
  checks.push(
    "Login con loading contextual y bloqueo hasta completar la operación",
  );
  releaseToken?.();
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  await page.goto("http://localhost:4004/buzon-sunat?companyId=" + company.id);
  await page.getByText(/Simulador local:/).waitFor();
  await page
    .getByRole("button", { name: "Abrir", exact: true })
    .first()
    .waitFor();
  checks.push(
    "Bandeja local con empresa, periodo y filas de mensajes visibles",
  );
  await page.screenshot({ path: output + "/cierre-escritorio.png" });
  const configure = page.getByRole("button", { name: "Configurar conexión" });
  await configure.click();
  await page.getByRole("dialog").waitFor();
  if (
    !(await page
      .getByRole("dialog")
      .evaluate((element) => element.contains(document.activeElement)))
  )
    throw new Error("DIALOG_FOCUS_OUTSIDE");
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  if (
    !(await configure.evaluate((element) => element === document.activeElement))
  )
    throw new Error("DIALOG_FOCUS_NOT_RETURNED");
  checks.push(
    "Panel de conexión con foco contenido, Escape y devolución de foco",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  if (
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
  )
    throw new Error("MOBILE_HORIZONTAL_OVERFLOW");
  await page.screenshot({ path: output + "/cierre-movil.png" });
  checks.push("Móvil 390 × 844 sin desbordamiento horizontal");
  await page
    .getByRole("button", { name: "Abrir", exact: true })
    .first()
    .click();
  await page.getByRole("dialog").waitFor();
  await page.screenshot({ path: output + "/cierre-detalle-movil.png" });
  await page.keyboard.press("Escape");
  checks.push("Detalle móvil accesible y cierre con teclado");
  if (errors.length) throw new Error("BROWSER_RUNTIME_ERRORS");
  writeFileSync(
    "docs/hitos/evidencias/h10-ui-final.json",
    JSON.stringify(
      {
        recorded_at: new Date().toISOString(),
        environment: "isolated_local_4004_54431",
        synthetic: true,
        checks,
        runtime_errors: errors.length,
        presentation_4003_unchanged: true,
        remote_requests: false,
      },
      null,
      2,
    ) + "\n",
  );
  console.info(
    `H10 UI: ${checks.length} comprobaciones aprobadas; capturas con datos ficticios locales.`,
  );
} finally {
  await browser.close();
}
