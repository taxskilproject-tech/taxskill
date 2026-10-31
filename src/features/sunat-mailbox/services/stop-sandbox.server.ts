import "server-only";
import { APIError, Sandbox } from "@vercel/sandbox";

import {
  SUNAT_SANDBOX_LOOKUP_TIMEOUT_MS,
  SUNAT_SANDBOX_STOP_TIMEOUT_MS,
} from "@/features/sunat-mailbox/constants/dispatch";

export async function stopSunatSandbox(sandbox: Sandbox): Promise<boolean> {
  try {
    if (sandbox.persistent)
      await sandbox.update(
        { persistent: false },
        { signal: AbortSignal.timeout(SUNAT_SANDBOX_STOP_TIMEOUT_MS) },
      );
    const stopped = await sandbox.stop({
      signal: AbortSignal.timeout(SUNAT_SANDBOX_STOP_TIMEOUT_MS),
    });
    const current = await Sandbox.get({
      name: sandbox.name,
      resume: false,
      signal: AbortSignal.timeout(SUNAT_SANDBOX_LOOKUP_TIMEOUT_MS),
    });
    if (stopped.snapshot || current.persistent || current.status !== "stopped")
      throw new Error("SANDBOX_CLEANUP_FAILED");
    return true;
  } catch {
    console.error(
      JSON.stringify({
        event: "sunat.dispatch.cleanup_failed",
        code: "SANDBOX_CLEANUP_FAILED",
      }),
    );
    return false;
  }
}

export async function stopNamedSunatSandbox(name: string): Promise<boolean> {
  try {
    const sandbox = await Sandbox.get({
      name,
      resume: false,
      signal: AbortSignal.timeout(SUNAT_SANDBOX_LOOKUP_TIMEOUT_MS),
    });
    return await stopSunatSandbox(sandbox);
  } catch (error) {
    if (error instanceof APIError && error.response.status === 404) return true;
    console.error(
      JSON.stringify({
        event: "sunat.dispatch.creation_unconfirmed",
        code: "SANDBOX_CLEANUP_FAILED",
      }),
    );
    return false;
  }
}
