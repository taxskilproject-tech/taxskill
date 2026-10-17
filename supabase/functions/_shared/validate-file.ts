import * as CFB from "cfb";
import { unzipSync } from "fflate";

import type { FilePolicy, ValidationResult } from "./types/document.types.ts";

const MIME = new Map([
  ["pdf", "application/pdf"], ["png", "image/png"], ["jpg", "image/jpeg"], ["jpeg", "image/jpeg"],
  ["doc", "application/msword"], ["xls", "application/vnd.ms-excel"],
  ["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ["xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
]);
const MAX_EXPANDED_BYTES = 40_000_000;
const MAX_XML_BYTES = 2_000_000;
const MAX_ENTRIES = 2000;
const decoder = new TextDecoder("utf-8", { fatal: true });

function starts(bytes: Uint8Array, signature: readonly number[]) {
  return signature.every((value, index) => bytes[index] === value);
}
function officeZip(bytes: Uint8Array, extension: string) {
  let expanded = 0;
  let count = 0;
  const root = extension === "xlsx" ? "xl/workbook.xml" : "word/document.xml";
  const files = unzipSync(bytes, { filter: (file) => {
    expanded += file.originalSize;
    count += 1;
    if (expanded > MAX_EXPANDED_BYTES || count > MAX_ENTRIES) throw new Error("FILE_INVALID");
    const selected = file.name === "[Content_Types].xml" || file.name === root;
    if (selected && file.originalSize > MAX_XML_BYTES) throw new Error("FILE_INVALID");
    return selected;
  } });
  if (!files[root] || !files["[Content_Types].xml"]) return false;
  const manifest = decoder.decode(files["[Content_Types].xml"]);
  const document = decoder.decode(files[root]);
  const contentType = extension === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml";
  const mainTag = extension === "xlsx" ? "workbook" : "document";
  return manifest.includes(contentType) && manifest.includes(`/${root}`) && new RegExp(`<([A-Za-z0-9_]+:)?${mainTag}[\\s>]`).test(document);
}
function legacyOffice(bytes: Uint8Array, extension: string) {
  if (!starts(bytes, [0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1])) return false;
  const container = CFB.read(bytes, { type: "array" });
  const entry = extension === "xls" ? CFB.find(container,"Workbook") ?? CFB.find(container,"Book") : CFB.find(container,"WordDocument");
  if (!entry?.content || entry.content.length < 4) return false;
  if (extension === "doc") return entry.content[0] === 0xec && entry.content[1] === 0xa5;
  return entry.content[0] === 0x09 && [0x00,0x02,0x04,0x08].includes(entry.content[1]);
}
function validSignature(bytes: Uint8Array, extension: string) {
  if (extension === "pdf") return starts(bytes,[0x25,0x50,0x44,0x46,0x2d]) && new TextDecoder().decode(bytes.slice(-2048)).includes("%%EOF");
  if (extension === "png") return bytes.length >= 45 && starts(bytes,[137,80,78,71,13,10,26,10]) && new TextDecoder().decode(bytes.slice(12,16)) === "IHDR" && new TextDecoder().decode(bytes.slice(-8,-4)) === "IEND";
  if (extension === "jpg" || extension === "jpeg") return bytes.length >= 12 && starts(bytes,[255,216,255]) && bytes[bytes.length-2] === 255 && bytes[bytes.length-1] === 217;
  if (extension === "xlsx" || extension === "docx") return starts(bytes,[80,75,3,4]) && officeZip(bytes,extension);
  return legacyOffice(bytes,extension);
}
export async function validateDocument(bytes: Uint8Array, name: string, declaredBytes: number, policy: FilePolicy): Promise<ValidationResult> {
  const extension = name.split(".").at(-1)?.toLowerCase() ?? "";
  if (!bytes.length || bytes.length > policy.max_file_bytes) throw new Error("FILE_TOO_LARGE");
  if (bytes.length !== declaredBytes || !policy.allowed_formats.includes(extension) || !MIME.has(extension)) throw new Error("FILE_INVALID");
  try {
    if (!validSignature(bytes,extension)) throw new Error("FILE_INVALID");
  } catch { throw new Error("FILE_INVALID"); }
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return {
    schema_version: 1, status: "accepted", actual_bytes: bytes.length, actual_mime: MIME.get(extension)!, extension,
    sha256: Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2,"0")).join(""),
    validated_at: new Date().toISOString(), error_code: null, validator_version: "h03.1",
    checks: { size: true, signature: true, office_container: extension === "xlsx" || extension === "docx" ? true : null },
  };
}
