import { mkdirSync, writeFileSync } from "node:fs";
import type { Page } from "playwright-core";
import { chromium } from "playwright-core";

import { loadH11LabEnvironment } from "./utils/h11-lab-environment";

const environment = loadH11LabEnvironment();
const origin = environment.APP_BASE_URL;
const allowedOrigins = new Set<string>([
  origin,
  environment.NEXT_PUBLIC_SUPABASE_URL,
]);
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const output = "docs/hitos/evidencias/capturas/h11";
mkdirSync(output, { recursive: true });
const checks: string[] = [];
const errors: string[] = [];
async function checkResponsiveWidths(page: Page) {
  for (const width of [375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      )
    ) {
      console.log(
        await page.evaluate(() =>
          [...document.querySelectorAll("main *")]
            .filter(
              (element) =>
                element.getBoundingClientRect().right > window.innerWidth,
            )
            .map((element) => ({
              tag: element.tagName,
              id: element.id,
              width: element.getBoundingClientRect().width,
            }))
            .slice(0, 15),
        ),
      );
      throw new Error("HORIZONTAL_OVERFLOW_" + width);
    }
  }
  checks.push("375, 390, 768, 1024 y 1440px sin desbordamiento");
}
async function verifyProfile(email: string) {
  const session = await browser.newContext({
    viewport: { width: 1366, height: 768 },
  });
  await session.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (!allowedOrigins.has(url.origin))
      throw new Error("REMOTE_TEST_DESTINATION_FORBIDDEN");
    await route.continue();
  });
  const page = await session.newPage();
  page.on("pageerror", (error) => errors.push(error.name));
  await page.goto(origin + "/login");
  await page.getByLabel(/Correo/).fill(email);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(environment.H11_FIXTURE_PASSWORD);
  await page.getByRole("button", { name: "Ingresar al estudio" }).click();
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  const indicators = page.getByRole("region", {
    name: "Indicadores por empresa",
  });
  await indicators.getByLabel("Periodo documental").fill("2026-10");
  const late = page
    .getByRole("button", { name: /Fuera de plazo de H11 Empresa A/ })
    .first();
  await late.waitFor({ state: "visible" });
  await late.click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("heading", { name: "Fuera de plazo", exact: true })
    .waitFor();
  await dialog
    .getByRole("link", { name: "PDT 2" })
    .or(dialog.getByRole("link", { name: "PDT 1" }))
    .first()
    .waitFor();
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  if (!(await late.evaluate((element) => document.activeElement === element)))
    throw new Error("DIALOG_FOCUS_NOT_RESTORED");
  checks.push(
    email.split("@")[0] + ": login, mes y detalle del indicador, Escape",
  );
  if (email === "h11-admin@example.test")
    await page.screenshot({
      path: output + "/indicadores-escritorio.png",
      fullPage: true,
    });
  const companyId = await page
    .getByLabel("Contexto de empresa", { exact: true })
    .first()
    .locator("option")
    .filter({ hasText: "H11 Empresa A" })
    .getAttribute("value");
  if (!companyId) throw new Error("LOCAL_COMPANY_REQUIRED");
  await page.goto(
    origin + "/empresas/" + companyId + "?tab=resumen&document_month=2026-10",
  );
  await page
    .getByRole("button", { name: "Fuera de plazo de H11 Empresa A" })
    .first()
    .waitFor();
  checks.push(
    email.split("@")[0] + ": resumen de empresa con pestaña y periodo",
  );
  await page.goto(origin + "/documentos?document_month=2026-10");
  await page
    .getByRole("button", { name: "Archivos subidos", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Abrir archivo" }).first().waitFor();
  if (email === "h11-client@example.test") {
    if (await page.getByLabel("Asistente contable", { exact: true }).count())
      throw new Error("CLIENT_SEES_ASSISTANT_SELECTOR");
  } else {
    await page
      .getByLabel("Asistente contable", { exact: true })
      .selectOption({ index: 1 });
    await page.waitForURL(/assistant_id=/);
  }
  await page
    .getByRole("button", { name: "Pendientes de entrega", exact: true })
    .click();
  await page.waitForURL(/document_view=pending/);
  await page
    .getByText("Archivos requeridos por subir o corregir.", { exact: true })
    .waitFor();
  await page.getByRole("link", { name: /PDT/ }).first().waitFor();
  const pendingOrigin = page.url();
  await page.getByRole("link", { name: /PDT/ }).first().click();
  await page.waitForURL(/\/actividades\//);
  if (!new URL(page.url()).searchParams.has("deliverableId"))
    throw new Error("SELECTED_FILE_NOT_PRESERVED");
  await page.getByRole("link", { name: "← Volver al listado" }).click();
  await page.waitForURL(pendingOrigin);
  await page.getByRole("link", { name: /PDT/ }).first().waitFor();
  checks.push(
    email.split("@")[0] +
      ": subidas, asistente, pendientes y retorno al listado",
  );
  if (email === "h11-admin@example.test") {
    await page.screenshot({
      path: output + "/pendientes-escritorio.png",
      fullPage: true,
    });
    await checkResponsiveWidths(page);
    await page.setViewportSize({ width: 390, height: 844 });
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      )
    )
      throw new Error("MOBILE_HORIZONTAL_OVERFLOW");
    await page.screenshot({
      path: output + "/pendientes-movil.png",
      fullPage: false,
    });
    await page.goto(origin + "/dashboard?document_month=2026-10");
    await page
      .locator("summary")
      .filter({ hasText: "H11 Empresa A" })
      .waitFor();
    await page.locator("summary").filter({ hasText: "H11 Empresa A" }).click();
    await page
      .getByRole("button", { name: "Fuera de plazo de H11 Empresa A" })
      .last()
      .waitFor();
    await page.screenshot({
      path: output + "/indicadores-movil.png",
      fullPage: false,
    });
    checks.push("Móvil 390px sin desbordamiento y empresa ampliable");
  }
  await session.close();
}
try {
  for (const email of [
    "h11-admin@example.test",
    "h11-staff@example.test",
    "h11-supervisor@example.test",
    "h11-client@example.test",
  ])
    await verifyProfile(email);
  if (errors.length) throw new Error("BROWSER_RUNTIME_ERRORS");
  writeFileSync(
    "docs/hitos/evidencias/h11-ui.json",
    JSON.stringify(
      {
        recorded_at: new Date().toISOString(),
        environment: "docker_h11_54631_app_4011",
        fictitious: true,
        checks,
        runtime_errors: errors.length,
        remote_requests: false,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(checks.length + " recorridos de interfaz H11 aprobados.");
} finally {
  await browser.close();
}
