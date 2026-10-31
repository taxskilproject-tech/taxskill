import "server-only";
import { Sandbox } from "@vercel/sandbox";

import { getAdminEnvironment } from "@/config/env/server-env.server";
import {
  SUNAT_CLAIM_FILE,
  SUNAT_DISPATCH_RPC_TIMEOUT_MS,
  SUNAT_RUNTIME_FILE,
  SUNAT_SANDBOX_COMMAND_TIMEOUT_MS,
  SUNAT_SANDBOX_CREATE_TIMEOUT_MS,
  SUNAT_SANDBOX_TIMEOUT_MS,
  SUNAT_SANDBOX_WRITE_TIMEOUT_MS,
} from "@/features/sunat-mailbox/constants/dispatch";
import {
  stopNamedSunatSandbox,
  stopSunatSandbox,
} from "@/features/sunat-mailbox/services/stop-sandbox.server";
import type {
  SunatDispatchExecution,
  SunatDispatchPhase,
} from "@/features/sunat-mailbox/types/dispatch.types";
import { sunatDispatchFailureCode } from "@/features/sunat-mailbox/utils/dispatch-failure.server";

export async function executeSunatSandbox({
  client,
  ticket,
  config,
}: SunatDispatchExecution) {
  let sandbox: Sandbox | null = null;
  let stopped = false;
  let errorCode = "";
  let creationRequested = false;
  let phase: SunatDispatchPhase = "configuration";
  const name = "taxskill-h10-" + ticket.run_id;
  try {
    const admin = getAdminEnvironment();
    if (!admin.ok) throw admin.error;
    const host = new URL(admin.data.supabaseUrl).hostname;
    creationRequested = true;
    phase = "create";
    sandbox = await Sandbox.create({
      name,
      image: config.SUNAT_SANDBOX_IMAGE,
      persistent: false,
      timeout: SUNAT_SANDBOX_TIMEOUT_MS,
      resources: { vcpus: 1 },
      ports: [],
      networkPolicy: { allow: ["sunat.gob.pe", "*.sunat.gob.pe", host] },
      signal: AbortSignal.timeout(SUNAT_SANDBOX_CREATE_TIMEOUT_MS),
    });
    if (sandbox.persistent) throw new Error("SANDBOX_CONFIGURATION_INVALID");
    // La imagen fija USER pwuser; run-one valida UID 1001. No cambiarlo con sudo.
    phase = "write";
    const filesSignal = AbortSignal.timeout(SUNAT_SANDBOX_WRITE_TIMEOUT_MS);
    await sandbox.writeFiles(
      [
        {
          path: SUNAT_CLAIM_FILE,
          mode: 0o600,
          content: JSON.stringify(ticket.claim),
        },
        {
          path: SUNAT_RUNTIME_FILE,
          mode: 0o600,
          content: JSON.stringify({
            SUNAT_WORKER_MODE: "sunat",
            SUNAT_SOURCE_VALIDATED: config.SUNAT_SOURCE_VALIDATED,
            SUPABASE_URL: admin.data.supabaseUrl,
            SUPABASE_SECRET_KEY: admin.data.secretKey,
            SUNAT_CREDENTIALS_CURRENT_KEY: config.SUNAT_CREDENTIALS_CURRENT_KEY,
            SUNAT_CREDENTIALS_KEYS: config.SUNAT_CREDENTIALS_KEYS,
          }),
        },
      ],
      { signal: filesSignal },
    );
    phase = "run";
    const commandSignal = AbortSignal.timeout(SUNAT_SANDBOX_COMMAND_TIMEOUT_MS);
    const command = await sandbox.runCommand({
      cmd: "xvfb-run",
      args: ["-a", "node", "/app/build/scripts/sunat-worker/run-one.js"],
      timeoutMs: SUNAT_SANDBOX_COMMAND_TIMEOUT_MS,
      detached: true,
      signal: commandSignal,
    });
    const result = await command.wait({
      signal: commandSignal,
    });
    if (result.exitCode !== 0) throw new Error("SANDBOX_EXECUTION_FAILED");
  } catch (error) {
    errorCode = sunatDispatchFailureCode(error);
    console.error(
      JSON.stringify({
        event: "sunat.dispatch.failed",
        run_id: ticket.run_id,
        code: errorCode,
        phase,
        failure_kind: error instanceof Error ? error.name : "UnknownError",
      }),
    );
  } finally {
    stopped = sandbox
      ? await stopSunatSandbox(sandbox)
      : creationRequested
        ? await stopNamedSunatSandbox(name)
        : true;
    if (!stopped) errorCode = "SANDBOX_CLEANUP_FAILED";
    const finished = await client
      .rpc("h10_dispatch_finish", {
        p_run_id: ticket.run_id,
        p_error_code: errorCode,
        p_stopped: stopped,
      })
      .abortSignal(AbortSignal.timeout(SUNAT_DISPATCH_RPC_TIMEOUT_MS));
    if (finished.error || finished.data !== true)
      console.error(
        JSON.stringify({
          event: "sunat.dispatch.finish_failed",
          run_id: ticket.run_id,
        }),
      );
  }
}
