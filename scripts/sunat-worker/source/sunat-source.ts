import type { SunatCredentialPayload } from "../../../src/domain/sunat/types/credentials.types";
import { MailboxError } from "../../sunat-pilot/worker/services/mailbox-error";
import type {
  MailboxKind,
  MailboxReadRequest,
} from "../../sunat-pilot/worker/types/mailbox.types";
import { WORKER_CLEANUP_TIMEOUT_MS } from "../constants/runtime";
import { SUNAT_CONNECTION_TIMEOUT_MS } from "../constants/source";
import { sunatPagePayloadSchema } from "../contracts/source.schema";
import { requestSunatPage } from "../repositories/sunat-request";
import { retrySunatConnection } from "../services/retry-connection";
import type {
  BrowserSession,
  SourceBrowserHandle,
  SourceOptions,
  SourceRecord,
  SunatSource,
} from "../types/source.types";
import { connectionAbortError } from "../utils/connection-signal";
import { mailboxType, parseNativePage } from "../utils/native-page";
import { attachmentFromLink } from "../utils/source-validation";
import { withinDeadline } from "../utils/within-deadline";
import { downloadSourceAttachment } from "./attachment-download";
import { openSunatSession } from "./browser-session";
import {
  nextMailboxPage,
  readObservedMailbox,
  selectMailbox,
} from "./observed-mailbox";
import { openMessageDetail } from "./open-message";

export class OfficialSunatSource implements SunatSource {
  readonly records = new Map<string, SourceRecord>();
  private session: BrowserSession | null = null;
  private credentials: SunatCredentialPayload | null = null;
  private count = 0;
  private connectionRevision = 0;
  private openingBrowser: SourceBrowserHandle | null = null;
  private connectionController: AbortController | null = null;
  constructor(private readonly options: SourceOptions = {}) {}

  async connect(
    credentials: SunatCredentialPayload,
    externalSignal?: AbortSignal,
  ) {
    if (this.session || this.connectionController)
      throw new MailboxError("JOB_ALREADY_RUNNING");
    const revision = ++this.connectionRevision;
    const controller = new AbortController();
    this.connectionController = controller;
    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(SUNAT_CONNECTION_TIMEOUT_MS),
      ...[externalSignal, this.options.signal].filter(
        (value): value is AbortSignal => Boolean(value),
      ),
    ]);
    this.credentials = credentials;
    try {
      const session = await retrySunatConnection(
        () =>
          openSunatSession(credentials, {
            ...this.options,
            signal,
            onBrowser: async (browser) => {
              if (revision !== this.connectionRevision) {
                await browser.close();
                throw new MailboxError("SESSION_EXPIRED");
              }
              this.openingBrowser = browser;
              await this.options.onBrowser?.(browser);
            },
            onRequest: () => {
              this.count += 1;
            },
          }),
        signal,
      );
      if (signal.aborted || revision !== this.connectionRevision) {
        await session.browser.close();
        throw signal.aborted
          ? connectionAbortError(signal)
          : new MailboxError("SESSION_EXPIRED");
      }
      this.session = session;
      this.openingBrowser = null;
    } catch (error) {
      await this.releaseFailedConnection(revision);
      throw error;
    } finally {
      if (this.connectionController === controller)
        this.connectionController = null;
    }
  }
  private async releaseFailedConnection(revision: number) {
    if (revision !== this.connectionRevision) return;
    this.connectionRevision += 1;
    const browser = this.openingBrowser;
    this.openingBrowser = null;
    this.credentials = null;
    if (!browser) return;
    await withinDeadline(
      browser.close(),
      WORKER_CLEANUP_TIMEOUT_MS,
      "WORKER_CLEANUP_FAILED",
    );
  }
  requestCount() {
    return this.count;
  }
  private ready() {
    if (!this.session || !this.credentials)
      throw new MailboxError("SESSION_EXPIRED");
    if (/api-seguridad/.test(this.session.page.url()))
      throw new MailboxError("SESSION_EXPIRED");
    return { ...this.session, credentials: this.credentials };
  }
  async renewSession(signal: AbortSignal) {
    if (signal.aborted) throw connectionAbortError(signal);
    const credentials = this.credentials;
    if (!credentials) throw new MailboxError("SESSION_EXPIRED");
    await this.close();
    if (signal.aborted) throw connectionAbortError(signal);
    await this.connect(credentials, signal);
  }
  async readPage(request: MailboxReadRequest) {
    request.signal.throwIfAborted();
    const session = this.ready();
    this.count += 1;
    const payload = await requestSunatPage(session, session.credentials.ruc, {
      tipoMsj: mailboxType(request.mailbox),
      codCarpeta: "00",
      codEtiqueta: "",
      page: request.page,
      des_asunto: "",
      codMensaje: "",
      tipoOrden: "NADA",
    });
    request.signal.throwIfAborted();
    const parsed = parseNativePage(
      payload,
      request.connectionKey,
      request.mailbox,
    );
    const rows = sunatPagePayloadSchema.parse(payload).rows;
    parsed.items.forEach((item, index) =>
      this.records.set(request.mailbox + ":" + item.id, {
        ...item,
        subject: rows[index].desAsunto.trim().slice(0, 500) || "Registro SUNAT",
      }),
    );
    return parsed;
  }
  async details(mailbox: MailboxKind, sourceId: string) {
    const { frame, credentials } = this.ready();
    await selectMailbox(frame, mailbox);
    for (let page = 1; page <= 20; page += 1) {
      const row = frame.locator("ul.list-group > li[id]");
      const ids = await row.evaluateAll((rows) => rows.map((item) => item.id));
      const index = ids.indexOf(sourceId);
      if (index >= 0) {
        const sourceMarkedRead = await openMessageDetail(
          frame,
          row.nth(index).locator("a.linkMensaje"),
        );
        const links = frame.locator('a[href*="/visor/bajarArchivo/"]');
        await frame.waitForLoadState("domcontentloaded");
        const attachments = await links.evaluateAll((elements) =>
          elements.map((element) => ({
            href: element.getAttribute("href") ?? "",
            text: element.textContent ?? "",
          })),
        );
        const content = await frame
          .locator(
            "#detallePanel .contenedor-correo #contenedorMensaje:not(iframe)",
          )
          .allInnerTexts();
        const title = await frame.locator("#idTitleDetalle").innerText();
        const date = await frame.locator("#idFechaDetalle").innerText();
        return {
          source_marked_read: sourceMarkedRead,
          text: [title, date, ...content].join("\n").slice(0, 200000),
          attachments: attachments.map((item) =>
            attachmentFromLink(
              item.href,
              item.text,
              frame.url(),
              credentials.ruc,
            ),
          ),
        };
      }
      const observed = await readObservedMailbox(frame);
      const counter = observed.text.match(/(\d+)\s*[-–]\s*(\d+)\s+de\s+(\d+)/);
      if (!counter || Number(counter[2]) >= Number(counter[3])) break;
      await nextMailboxPage(frame);
    }
    throw new MailboxError("SOURCE_CHANGED");
  }
  async attachment(locator: string) {
    const session = this.ready();
    return downloadSourceAttachment(session, session.credentials.ruc, locator);
  }
  async close() {
    this.connectionRevision += 1;
    this.connectionController?.abort(new MailboxError("SESSION_EXPIRED"));
    this.connectionController = null;
    const session = this.session;
    const openingBrowser = this.openingBrowser;
    this.session = null;
    this.openingBrowser = null;
    this.credentials = null;
    this.records.clear();
    await Promise.all(
      [...new Set([session?.browser, openingBrowser])]
        .filter((browser) => browser !== null && browser !== undefined)
        .map((browser) => browser.close()),
    );
  }
}
