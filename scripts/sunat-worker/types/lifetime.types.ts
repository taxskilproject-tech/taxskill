export type WorkerStopReason = "ACCESS_REVOKED" | "WORKER_TIMEOUT";

export interface WorkerLifetime {
  signal: AbortSignal;
  wait<T>(work: PromiseLike<T>): Promise<T>;
  check(): void;
  errorCode(error: unknown): string;
  dispose(): Promise<void>;
}

export interface WorkerStatusWriteResult {
  data: boolean | null;
  error: unknown;
}
