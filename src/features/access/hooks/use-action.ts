"use client";

import { useEffect, useRef, useState } from "react";

import type { OperationResult } from "@/domain/common/types/operation.types";
import { normalizeOperationError } from "@/domain/common/utils/normalize-operation-error";
import type { ActionState } from "@/features/access/types/access-ui.types";

export function useAction<T>(): ActionState<T> {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<T | null>(null);
  const active = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function run(work: () => Promise<OperationResult<T>>) {
    if (active.current) return false;
    active.current = true;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await work();
      if (!mounted.current) return false;
      if (!response.ok) {
        setError(response.error.message);
        return false;
      }
      setResult(response.data);
      return true;
    } catch (cause) {
      if (mounted.current) setError(normalizeOperationError(cause).message);
      return false;
    } finally {
      active.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return {
    busy,
    error,
    result,
    run,
    clear: () => {
      setError(null);
      setResult(null);
    },
  };
}
