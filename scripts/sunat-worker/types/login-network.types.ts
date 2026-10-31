import type { z } from "zod";

import type { loginNetworkSnapshotSchema } from "../contracts/login-network.schema";

export type LoginNetworkSnapshot = z.infer<typeof loginNetworkSnapshotSchema>;
export type LoginRedirect = LoginNetworkSnapshot["redirects"][number];
export type LoginRequestFailure =
  LoginNetworkSnapshot["failed_requests"][number];

export interface LoginNetworkRecorder {
  begin: () => void;
  response: (url: string, status: number, location: string | null) => void;
  failure: (url: string, resource: string, code: string | null) => void;
  blocked: (url: string, limitExceeded: boolean) => void;
  webError: (name: string) => void;
  consoleError: () => void;
  read: () => LoginNetworkSnapshot;
}
