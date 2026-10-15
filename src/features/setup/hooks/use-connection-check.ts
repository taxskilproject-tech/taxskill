"use client";

import { useEffect, useRef, useState } from "react";

import { getPublicEnvironment } from "@/config/env/public-env";
import type { OperationResult } from "@/domain/common/types/operation.types";
import { normalizeOperationError } from "@/domain/common/utils/normalize-operation-error";
import { checkSupabaseConnection } from "@/features/setup/repositories/connection.repository";
import type { ConnectionCheck } from "@/features/setup/types/setup.types";

export function useConnectionCheck() {
  const [configuration] = useState(getPublicEnvironment);
  const [result, setResult] = useState<OperationResult<ConnectionCheck> | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => () => activeRequest.current?.abort(), []);

  async function checkConnection() {
    if (activeRequest.current || !configuration.ok) return;

    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setResult(null);

    try {
      const nextResult = await checkSupabaseConnection(controller.signal);
      if (!controller.signal.aborted) setResult(nextResult);
    } catch (error: unknown) {
      if (!controller.signal.aborted) {
        setResult({ ok: false, error: normalizeOperationError(error) });
      }
    } finally {
      if (!controller.signal.aborted) setPending(false);
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }

  return { checkConnection, configuration, pending, result };
}
