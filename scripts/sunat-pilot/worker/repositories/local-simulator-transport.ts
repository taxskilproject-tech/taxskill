import { MailboxError } from "../services/mailbox-error";
import type { MailboxLabScenario } from "../types/lab.types";
import type { MailboxTransport } from "../types/mailbox.types";

const MAX_RESPONSE_BYTES = 262144;

export function assertLocalMailboxSimulator(origin: string): URL {
  const target = new URL(origin);
  if (
    target.protocol !== "http:" ||
    target.hostname !== "127.0.0.1" ||
    !target.port ||
    Number(target.port) < 1024 ||
    target.username ||
    target.password ||
    target.pathname !== "/" ||
    target.search ||
    target.hash
  )
    throw new Error("LOCAL_SIMULATOR_REQUIRED");
  return target;
}

async function readLimitedJson(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new MailboxError("UNEXPECTED_RESPONSE");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new MailboxError("UNEXPECTED_RESPONSE");
    }
    chunks.push(chunk.value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new MailboxError("UNEXPECTED_RESPONSE");
  }
}

function assertResponseStatus(status: number): void {
  if (status === 401) throw new MailboxError("SESSION_EXPIRED");
  if (status === 403) throw new MailboxError("CREDENTIAL_REJECTED");
  if (status === 428) throw new MailboxError("VERIFICATION_REQUIRED");
  if (status === 429 || status >= 500)
    throw new MailboxError("SOURCE_UNAVAILABLE");
  if (status !== 200) throw new MailboxError("UNEXPECTED_RESPONSE");
}

async function simulatorRequest(target: URL, signal: AbortSignal) {
  try {
    const response = await fetch(target, { signal, redirect: "error" });
    assertResponseStatus(response.status);
    return await readLimitedJson(response);
  } catch (error) {
    if (error instanceof MailboxError) throw error;
    throw new MailboxError("SOURCE_UNAVAILABLE");
  }
}

export function createLocalMailboxSimulatorTransport(
  origin: string,
  scenario: MailboxLabScenario,
): MailboxTransport {
  const base = assertLocalMailboxSimulator(origin);
  return {
    async readPage(request) {
      const target = new URL("/page", base);
      target.searchParams.set("scenario", scenario);
      target.searchParams.set("connection", request.connectionKey);
      target.searchParams.set("mailbox", request.mailbox);
      target.searchParams.set("page", String(request.page));
      return simulatorRequest(target, request.signal);
    },
    async renewSession(signal) {
      const target = new URL("/renew", base);
      target.searchParams.set("scenario", scenario);
      await simulatorRequest(target, signal);
    },
  };
}
