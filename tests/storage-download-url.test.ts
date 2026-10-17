import { expect, it } from "vitest";

import { resolveStorageDownloadUrl } from "../supabase/functions/document-operations/utils/resolve-storage-download-url";

const signedPath =
  "/storage/v1/object/sign/documents/example.pdf?token=fixture%2Bsignature&download=";

it("expone la descarga local conservando exactamente ruta y firma", () => {
  expect(
    resolveStorageDownloadUrl(
      "http://kong:8000" + signedPath,
      "http://127.0.0.1:54331",
    ),
  ).toBe("http://127.0.0.1:54331" + signedPath);
});

it("conserva el contrato de descarga HTTPS del entorno real", () => {
  expect(
    resolveStorageDownloadUrl(
      "https://example.supabase.co" + signedPath,
      "https://example.supabase.co",
    ),
  ).toBe("https://example.supabase.co" + signedPath);
});

it.each([
  "http://kong:8000",
  "http://remote.example",
  "https://user:password@example.supabase.co",
  "https://example.supabase.co/another-path",
  "https://example.supabase.co?redirect=external",
])("rechaza un origen de publicación inválido: %s", (base) => {
  expect(() =>
    resolveStorageDownloadUrl("http://kong:8000" + signedPath, base),
  ).toThrow();
});

it("rechaza rutas ajenas al contrato de Storage", () => {
  expect(() =>
    resolveStorageDownloadUrl(
      "http://kong:8000/redirect?token=fixture",
      "http://127.0.0.1:54331",
    ),
  ).toThrow();
});
