import type { BrowserContext } from "playwright-core";

import { createLoginNetworkRecorder } from "../services/login-network-recorder";
import type {
  LoginHttpStatus,
  LoginStatusMonitor,
} from "../types/login-diagnostics.types";
import { loginResponseKind } from "../utils/login-diagnostics";

export function observeLoginResponses(
  context: BrowserContext,
): LoginStatusMonitor {
  const network = createLoginNetworkRecorder();
  let statuses: LoginHttpStatus = {
    login_http_status: null,
    menu_http_status: null,
  };
  context.on("response", (response) => {
    const kind = loginResponseKind(response.url(), response.request().method());
    if (kind) {
      const key = kind === "login" ? "login_http_status" : "menu_http_status";
      statuses = { ...statuses, [key]: response.status() };
    }
    if (!response.request().isNavigationRequest()) return;
    network.response(
      response.url(),
      response.status(),
      response.headers().location ?? null,
    );
  });
  context.on("requestfailed", (request) => {
    network.failure(
      request.url(),
      request.resourceType(),
      request.failure()?.errorText ?? null,
    );
  });
  context.on("weberror", (error) => network.webError(error.error().name));
  context.on("console", (message) => {
    if (message.type() === "error") network.consoleError();
  });
  return {
    read: () => ({ ...statuses, network: network.read() }),
    begin: () => {
      statuses = { login_http_status: null, menu_http_status: null };
      network.begin();
    },
    blocked: network.blocked,
  };
}
