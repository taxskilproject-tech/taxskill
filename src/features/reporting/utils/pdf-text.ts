import type { PDFFont } from "pdf-lib";

export function pdfText(value: string): string {
  // Standard PDF fonts support Spanish. Preserve unsupported code points visibly instead of dropping them.
  return [...value.replace(/\r\n?/g, "\n")]
    .map((character) => {
      const point = character.codePointAt(0) ?? 0;
      if (
        character === "\n" ||
        (point >= 32 && point <= 126) ||
        (point >= 160 && point <= 255) ||
        "€–—‘’“”•…".includes(character)
      )
        return character;
      return `[U+${point.toString(16).toUpperCase()}]`;
    })
    .join("");
}
export function wrapPdfText(
  value: string,
  width: number,
  font: PDFFont,
  size: number,
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const character of pdfText(value)) {
    if (character === "\n") {
      lines.push(current);
      current = "";
      continue;
    }
    if (current && font.widthOfTextAtSize(current + character, size) > width) {
      const lastSpace = current.lastIndexOf(" ");
      lines.push(lastSpace > 0 ? current.slice(0, lastSpace) : current);
      current =
        lastSpace > 0 ? current.slice(lastSpace + 1) + character : character;
      continue;
    }
    current += character;
  }
  lines.push(current);
  return lines;
}
