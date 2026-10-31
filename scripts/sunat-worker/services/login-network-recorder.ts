import { LOGIN_TRACE_LIMIT } from "../constants/login-diagnostics";
import {
  loginNetworkSnapshotSchema,
  loginScriptErrorKindSchema,
} from "../contracts/login-network.schema";
import type {
  LoginNetworkRecorder,
  LoginNetworkSnapshot,
} from "../types/login-network.types";
import { loginPageKind } from "../utils/login-diagnostics";
import {
  safeLoginRedirect,
  safeLoginRequestFailure,
} from "../utils/login-network";

function initialSnapshot(): LoginNetworkSnapshot {
  return {
    redirects: [],
    document_responses: [],
    failed_requests: [],
    blocked_requests: 0,
    last_blocked_origin: null,
    request_limit_exceeded: false,
    web_error_count: 0,
    last_web_error: null,
    console_error_count: 0,
  };
}

export function createLoginNetworkRecorder(): LoginNetworkRecorder {
  let snapshot = initialSnapshot();
  return {
    begin: () => {
      snapshot = initialSnapshot();
    },
    response: (url, status, location) => {
      if (!Number.isInteger(status) || status < 100 || status > 599) return;
      const redirect = safeLoginRedirect(url, status, location);
      snapshot = {
        ...snapshot,
        document_responses: [
          ...snapshot.document_responses,
          {
            origin: loginPageKind(url),
            status,
          },
        ].slice(-LOGIN_TRACE_LIMIT),
        redirects: redirect
          ? [...snapshot.redirects, redirect].slice(-LOGIN_TRACE_LIMIT)
          : snapshot.redirects,
      };
    },
    failure: (url, resource, code) => {
      snapshot = {
        ...snapshot,
        failed_requests: [
          ...snapshot.failed_requests,
          safeLoginRequestFailure(url, resource, code),
        ].slice(-LOGIN_TRACE_LIMIT),
      };
    },
    blocked: (url, limitExceeded) => {
      snapshot = {
        ...snapshot,
        blocked_requests: snapshot.blocked_requests + 1,
        last_blocked_origin: loginPageKind(url),
        request_limit_exceeded:
          snapshot.request_limit_exceeded || limitExceeded,
      };
    },
    webError: (name) => {
      const kind = loginScriptErrorKindSchema.safeParse(name);
      snapshot = {
        ...snapshot,
        web_error_count: snapshot.web_error_count + 1,
        last_web_error: kind.success ? kind.data : "Other",
      };
    },
    consoleError: () => {
      snapshot = {
        ...snapshot,
        console_error_count: snapshot.console_error_count + 1,
      };
    },
    read: () => loginNetworkSnapshotSchema.parse(snapshot),
  };
}
