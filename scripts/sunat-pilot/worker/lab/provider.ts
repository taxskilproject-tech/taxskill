import { createServer } from "node:http";

import { mailboxLabScenarioSchema } from "../contracts/lab.schema";
import { mailboxKindSchema } from "../contracts/mailbox.schema";
import type { MailboxLabProvider } from "../types/lab.types";
import { mailboxLabResponse } from "./scenarios";

// This simulator never proxies traffic or accepts credentials.
export async function startMailboxLabProvider(): Promise<MailboxLabProvider> {
  const attempts = new Map<string, number>();
  const renewed = new Set<string>();
  let requestCount = 0;
  const server = createServer((request, response) => {
    requestCount += 1;
    const target = new URL(request.url ?? "/", "http://127.0.0.1");
    const scenarioResult = mailboxLabScenarioSchema.safeParse(
      target.searchParams.get("scenario"),
    );
    const mailboxResult = mailboxKindSchema.safeParse(
      target.searchParams.get("mailbox"),
    );
    response.setHeader("content-type", "application/json");
    if (!scenarioResult.success) {
      response.statusCode = 400;
      response.end("{}");
      return;
    }
    const scenario = scenarioResult.data;
    if (target.pathname === "/renew") {
      renewed.add(scenario);
      response.end("{}");
      return;
    }
    const page = Number(target.searchParams.get("page"));
    if (!mailboxResult.success || !Number.isInteger(page) || page < 1) {
      response.statusCode = 400;
      response.end("{}");
      return;
    }
    if (scenario === "timeout" && page === 2) return;
    const key = scenario + ":" + page;
    const attempt = (attempts.get(key) ?? 0) + 1;
    attempts.set(key, attempt);
    const result = mailboxLabResponse(
      { scenario, page, attempt, renewed: renewed.has(scenario) },
      target.searchParams.get("connection") ?? "",
      mailboxResult.data,
    );
    response.statusCode = result.status;
    response.end(JSON.stringify(result.payload));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("LAB_PORT_UNAVAILABLE");
  return {
    server,
    origin: "http://127.0.0.1:" + address.port,
    requests: () => requestCount,
  };
}
