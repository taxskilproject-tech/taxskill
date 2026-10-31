import type { Browser, BrowserContext, Frame, Page } from "playwright-core";
import type { z } from "zod";

import type { SunatCredentialPayload } from "../../../src/domain/sunat/types/credentials.types";
import type {
  MailboxItem,
  MailboxKind,
  MailboxTransport,
} from "../../sunat-pilot/worker/types/mailbox.types";
import type { sunatPagePayloadSchema } from "../contracts/source.schema";

export type SunatPagePayload = z.infer<typeof sunatPagePayloadSchema>;
export type SourceRequestParams = Record<string, string | number>;
export type SourceBrowserHandle = Pick<Browser, "close">;

export interface SourceRecord extends MailboxItem {
  subject: string;
}
export interface SourceAttachment {
  source_key: string;
  filename: string;
  locator: string;
}
export interface SourceDetail {
  text: string;
  attachments: SourceAttachment[];
  source_marked_read?: boolean | null;
}
export interface SourceFile {
  bytes: Buffer;
  mime: string;
}
export interface SunatSource extends MailboxTransport {
  records: ReadonlyMap<string, SourceRecord>;
  connect(
    credentials: SunatCredentialPayload,
    signal?: AbortSignal,
  ): Promise<void>;
  details(mailbox: MailboxKind, sourceId: string): Promise<SourceDetail>;
  attachment(locator: string): Promise<SourceFile>;
  close(): Promise<void>;
  requestCount(): number;
}
export interface BrowserSession {
  browser: SourceBrowserHandle;
  context: BrowserContext;
  page: Page;
  frame: Frame;
}
export interface MailboxLocation {
  page: Page;
  frame: Frame;
}
export interface SourceOptions {
  signal?: AbortSignal;
  onRequest?: () => void;
  executablePath?: string;
  fixtureOrigin?: string;
  onBrowser?: (browser: SourceBrowserHandle) => void | Promise<void>;
}

export interface SolLoginGlobals extends Window {
  login?: () => void;
  tipoLogueo?: number;
  txtRuc?: { val?: () => unknown } | null;
  txtUsuario?: { val?: () => unknown } | null;
  txtContrasena?: { val?: () => unknown } | null;
}

export interface SolControlEvents {
  click?: readonly unknown[];
}

export interface SolMenuLibrary {
  _data?: (element: Element, name: string) => SolControlEvents | undefined;
}

export interface SolMenuGlobals extends Window {
  jQuery?: SolMenuLibrary;
}

export type ConnectionTask<T> = () => Promise<T>;
export interface ObservedRow {
  id: string;
  text: string;
  subject: string;
  unread: boolean;
}
export interface ObservedPage {
  text: string;
  rows: ObservedRow[];
}
