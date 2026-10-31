import type { LOGIN_PAGE_KINDS } from "../constants/login-diagnostics";
import type { LoginNetworkSnapshot } from "./login-network.types";

export type LoginPageKind = (typeof LOGIN_PAGE_KINDS)[number];

export interface LoginHttpStatus {
  login_http_status: number | null;
  menu_http_status: number | null;
  network?: LoginNetworkSnapshot;
}

export type LoginStatusReader = () => LoginHttpStatus;

export interface LoginStatusMonitor {
  read: LoginStatusReader;
  begin: () => void;
  blocked: (url: string, limitExceeded: boolean) => void;
}

export interface LoginObservation {
  url: string;
  text: string;
  login_form_visible: boolean;
  captcha_visible: boolean;
  exit_count: number;
  mailbox_count: number;
  http: LoginHttpStatus;
}

export interface LoginDiagnostics extends LoginHttpStatus {
  page_kind: LoginPageKind;
  login_form_visible: boolean;
  captcha_visible: boolean;
  exit_count: number;
  mailbox_count: number;
  credential_error: boolean;
  verification_notice: boolean;
  maintenance_notice: boolean;
  access_denied_notice: boolean;
  network_observation: LoginNetworkSnapshot | null;
}
