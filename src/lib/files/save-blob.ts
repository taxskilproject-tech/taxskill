const OBJECT_URL_LIFETIME_MS = 1000;

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.replaceAll(/[\\/\u0000-\u001f]/g, "-").slice(0, 250) || "archivo";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_LIFETIME_MS);
}
