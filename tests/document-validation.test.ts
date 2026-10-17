import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { validateDocument } from "../supabase/functions/_shared/validate-file";

const policy = {
  allowed_formats: ["pdf", "png", "jpg", "jpeg", "xls", "xlsx", "doc", "docx"],
  max_file_bytes: 20_000_000,
};
const pdf = new TextEncoder().encode(
  "%PDF-1.4\n1 0 obj <</Type /Catalog>> endobj\n%%EOF",
);
function office(extension: string) {
  const root = extension === "xlsx" ? "xl/workbook.xml" : "word/document.xml";
  const content =
    extension === "xlsx"
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml";
  return zipSync({
    "[Content_Types].xml": strToU8(
      `<Types><Override PartName="/${root}" ContentType="${content}"/></Types>`,
    ),
    [root]: strToU8(
      extension === "xlsx"
        ? '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"/>'
        : '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>',
    ),
  });
}
describe("trusted binary validation", () => {
  it("validates actual PDF bytes and computes a stable SHA256", async () => {
    const first = await validateDocument(pdf, "PDT.pdf", pdf.length, policy);
    const second = await validateDocument(pdf, "PDT.pdf", pdf.length, policy);
    expect(first.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(first.sha256).toBe(second.sha256);
    expect(first.actual_mime).toBe("application/pdf");
    expect(first.checks.office_container).toBeNull();
  });
  it.each(["xlsx", "docx"])(
    "accepts the correct %s main part",
    async (extension) => {
      const bytes = office(extension);
      expect(
        (
          await validateDocument(
            bytes,
            `file.${extension}`,
            bytes.length,
            policy,
          )
        ).checks.office_container,
      ).toBe(true);
    },
  );
  it("rejects an arbitrary ZIP renamed XLSX", async () => {
    const bytes = zipSync({ "notes.txt": strToU8("not an Office workbook") });
    await expect(
      validateDocument(bytes, "fake.xlsx", bytes.length, policy),
    ).rejects.toThrow("FILE_INVALID");
  });
  it("rejects DOCX renamed XLSX", async () => {
    const bytes = office("docx");
    await expect(
      validateDocument(bytes, "fake.xlsx", bytes.length, policy),
    ).rejects.toThrow("FILE_INVALID");
  });
  it("rejects oversized XML before expanding the archive", async () => {
    const bytes = zipSync({
      "[Content_Types].xml": new Uint8Array(2_000_001),
      "xl/workbook.xml": strToU8("<workbook/>"),
    });
    await expect(
      validateDocument(bytes, "bomb.xlsx", bytes.length, policy),
    ).rejects.toThrow("FILE_INVALID");
  });
  it.each(["xls", "doc", "png", "jpg"])(
    "rejects PDF renamed %s",
    async (extension) => {
      await expect(
        validateDocument(pdf, `fake.${extension}`, pdf.length, policy),
      ).rejects.toThrow("FILE_INVALID");
    },
  );
  it("rejects a declared size that differs from the object", async () => {
    await expect(
      validateDocument(pdf, "file.pdf", pdf.length + 1, policy),
    ).rejects.toThrow("FILE_INVALID");
  });
  it("preserves the snapshot limit", async () => {
    await expect(
      validateDocument(pdf, "file.pdf", pdf.length, {
        ...policy,
        max_file_bytes: pdf.length - 1,
      }),
    ).rejects.toThrow("FILE_TOO_LARGE");
  });
  it("rejects PDF without its closing marker", async () => {
    const bytes = strToU8("%PDF-1.4 truncated");
    await expect(
      validateDocument(bytes, "file.pdf", bytes.length, policy),
    ).rejects.toThrow("FILE_INVALID");
  });
});
