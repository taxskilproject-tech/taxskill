"use client";
import { useScopedCommand } from "@/features/access/hooks/use-scoped-command";
import { workerCommand } from "@/features/workers/repositories/worker.repository";

export function useWorkerCommand() {
  return useScopedCommand(workerCommand);
}
