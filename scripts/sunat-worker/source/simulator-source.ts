import { PDFDocument, StandardFonts } from "pdf-lib";

import type { SunatCredentialPayload } from "../../../src/domain/sunat/types/credentials.types";
import { getLimaDate } from "../../../src/domain/time/utils/instant";
import { MailboxError } from "../../sunat-pilot/worker/services/mailbox-error";
import type { MailboxReadRequest } from "../../sunat-pilot/worker/types/mailbox.types";
import type { SourceRecord, SunatSource } from "../types/source.types";

export class SimulatorSunatSource implements SunatSource {
  readonly records = new Map<string, SourceRecord>();
  private ruc = "";
  private count = 0;
  constructor(url: string) {
    if (!/^http:\/\/(127\.0\.0\.1|host\.docker\.internal):54431$/.test(url))
      throw new Error("SIMULATOR_REQUIRES_ISOLATED_DOCKER");
  }
  async connect(credentials: SunatCredentialPayload) {
    this.count += 1;
    if (!credentials.username.startsWith("simulator-"))
      throw new MailboxError("CREDENTIAL_REJECTED");
    this.ruc = credentials.ruc;
  }
  requestCount() {
    return this.count;
  }
  async renewSession(signal: AbortSignal) {
    signal.throwIfAborted();
    this.count += 1;
  }
  async readPage(request: MailboxReadRequest) {
    request.signal.throwIfAborted();
    this.count += 1;
    const total = 32;
    const today = getLimaDate(new Date());
    if (!today.ok) throw new Error("LOCAL_DATE_UNAVAILABLE");
    const start = (request.page - 1) * 25;
    const items: SourceRecord[] = Array.from(
      { length: Math.min(25, total - start) },
      (_, index) => {
        const position = start + index;
        const date = new Date(today.data + "T12:00:00Z");
        date.setUTCDate(date.getUTCDate() - position);
        return {
          id: `simulator-${request.mailbox}-${position}`,
          published_on: date.toISOString().slice(0, 10),
          read: position % 2 === 0,
          has_attachments: true,
          subject: `Demostración local ${position + 1}`,
        };
      },
    );
    items.forEach((item) =>
      this.records.set(request.mailbox + ":" + item.id, item),
    );
    return {
      connection_key: request.connectionKey,
      mailbox: request.mailbox,
      page: request.page,
      page_size: 25,
      total,
      start: start + 1,
      end: start + items.length,
      order: "published_desc",
      items: items.map((item) => ({
        id: item.id,
        published_on: item.published_on,
        read: item.read,
        has_attachments: item.has_attachments,
      })),
    };
  }
  async details() {
    return {
      text: "Mensaje ficticio de pruebas locales. No procede de SUNAT.",
      attachments: [
        {
          source_key: "simulator-pdf",
          filename: "demostracion.pdf",
          locator:
            "/ol-ti-itvisornoti/visor/bajarArchivo/simulator/" + this.ruc,
        },
      ],
    };
  }
  async attachment() {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    pdf.addPage().drawText("TaxSkill - Prueba local H10", {
      x: 50,
      y: 700,
      size: 16,
      font,
    });
    return { bytes: Buffer.from(await pdf.save()), mime: "application/pdf" };
  }
  async close() {
    this.ruc = "";
  }
}
