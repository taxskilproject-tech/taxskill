import {
  loginFailureCodeSchema,
  loginResourceKindSchema,
} from "../contracts/login-network.schema";
import type {
  LoginRedirect,
  LoginRequestFailure,
} from "../types/login-network.types";
import { loginPageKind } from "./login-diagnostics";

export function safeLoginRedirect(
  url: string,
  status: number,
  location: string | null,
): LoginRedirect | null {
  if (!Number.isInteger(status) || status < 300 || status >= 400 || !location)
    return null;
  try {
    const destination = new URL(location, url);
    return {
      from: loginPageKind(url),
      to: loginPageKind(destination.href),
      status,
      https: destination.protocol === "https:",
    };
  } catch {
    return null;
  }
}

export function safeLoginRequestFailure(
  url: string,
  resource: string,
  code: string | null,
): LoginRequestFailure {
  const kind = loginResourceKindSchema.safeParse(resource);
  const failure = loginFailureCodeSchema.safeParse(code?.replace(/^net::/, ""));
  return {
    origin: loginPageKind(url),
    resource: kind.success ? kind.data : "other",
    code: failure.success ? failure.data : "OTHER",
  };
}
