export interface H06ProviderCall {
  count: number;
  status: string;
  provider_message_id: string;
  occurred_at: string;
}
export interface H06DispatchCall {
  batch_id: string;
  hash: string;
  at: string;
}
export interface H06MockState {
  providerMode: "sent" | "delivered" | "failed" | "unknown" | "timeout";
  faults: (number | "lost_response" | "timeout")[];
  providerCalls: Record<string, H06ProviderCall>;
  dispatchCalls: H06DispatchCall[];
}
export interface H06FaultOptions {
  providerMode?: H06MockState["providerMode"];
  faults?: H06MockState["faults"];
  reset?: boolean;
}
