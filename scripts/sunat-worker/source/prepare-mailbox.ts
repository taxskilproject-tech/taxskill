import type { Locator, Page } from "playwright-core";

import { SUNAT_LOGIN_READY_TIMEOUT_MS } from "../constants/source";
import type { SolMenuGlobals } from "../types/source.types";
import { mailboxControl } from "./login-outcome";

export async function prepareMailboxControl(menu: Page): Promise<Locator> {
  await menu.waitForLoadState("load", {
    timeout: SUNAT_LOGIN_READY_TIMEOUT_MS,
  });
  const officialControl = menu.locator("#aOpcionBuzon");
  if (!(await officialControl.count())) return mailboxControl(menu);
  // El enlace del menú existe antes de que SOL registre su acción de apertura.
  await menu.waitForFunction(
    () => {
      const element = document.getElementById("aOpcionBuzon");
      if (!element) return false;
      const portal: SolMenuGlobals = window;
      const events = portal.jQuery?._data?.(element, "events");
      return (
        typeof element.onclick === "function" || Boolean(events?.click?.length)
      );
    },
    undefined,
    { timeout: SUNAT_LOGIN_READY_TIMEOUT_MS },
  );
  return officialControl;
}
