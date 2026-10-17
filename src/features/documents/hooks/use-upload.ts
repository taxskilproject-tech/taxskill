"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { success } from "@/domain/common/utils/operation-result";
import type { UploadProgress } from "@/domain/documents/types/document.types";
import { useAction } from "@/features/access/hooks/use-action";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { documentCommand } from "@/features/documents/repositories/document.repository";
import { executeUpload } from "@/features/documents/services/upload.service";
import type { UploadControlProps } from "@/features/documents/types/document-ui.types";

export function useUpload({
  deliverable,
  cycle,
  recovery,
}: UploadControlProps) {
  const action = useAction<null>();
  const cache = useQueryClient();
  const { context } = useWorkspace();
  const controller = useRef<AbortController | null>(null);
  const running = useRef(false);
  const requestId = useRef(crypto.randomUUID());
  const [progress, setProgress] = useState<UploadProgress>({
    phase: "idle",
    percent: 0,
  });
  useEffect(() => () => controller.current?.abort(), []);
  async function reserve(input: Record<string, unknown>) {
    const result = await documentCommand(
      context.organization.id,
      requestId.current,
      "CreateUploadIntent",
      input,
    );
    if (!result.ok) throw result.error;
    return result.data;
  }
  async function upload(file: File | null) {
    if (running.current) return;
    running.current = true;
    const current = new AbortController();
    controller.current = current;
    try {
      await action.run(async () => {
        try {
          await executeUpload({
            file,
            deliverable,
            cycle,
            recovery,
            signal: current.signal,
            reserve,
            onProgress: (value) => {
              if (!current.signal.aborted) setProgress(value);
            },
          });
          if (!current.signal.aborted)
            setProgress({ phase: "ready", percent: 100 });
          return success(null);
        } finally {
          if (!current.signal.aborted) await cache.invalidateQueries();
        }
      });
    } finally {
      running.current = false;
    }
  }
  function resetIntent() {
    requestId.current = crypto.randomUUID();
    action.clear();
  }
  return { ...action, progress, upload, resetIntent };
}
