"use client";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";

import {
  createPdfRender,
  disposePdf,
  openPdfDocument,
} from "@/features/documents/repositories/pdf-preview.repository";
import type {
  PdfCanvasRef,
  PreviewReady,
} from "@/features/documents/types/preview.types";

const PREVIEW_ERROR =
  "No se pudo mostrar este PDF. Puedes descargar el archivo para revisarlo.";
export function usePdfPreview(
  url: string,
  onReady: PreviewReady,
  canvas: PdfCanvasRef,
) {
  const document = useRef<PDFDocumentProxy | null>(null);
  const rendering = useRef<RenderTask | null>(null);
  const mounted = useRef(true);
  const running = useRef(true);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [pendingPage, setPendingPage] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    mounted.current = true;
    async function load() {
      try {
        const opened = await openPdfDocument(url);
        if (!active || !canvas.current) {
          disposePdf(opened);
          return;
        }
        document.current = opened;
        setPages(opened.numPages);
        rendering.current = await createPdfRender({
          document: opened,
          pageNumber: 1,
          canvas: canvas.current,
        });
        await rendering.current.promise;
      } catch {
        if (active) setError(PREVIEW_ERROR);
      } finally {
        if (active) {
          running.current = false;
          setBusy(false);
          onReady();
        }
      }
    }
    void load();
    return () => {
      active = false;
      mounted.current = false;
      rendering.current?.cancel();
      disposePdf(document.current);
      document.current = null;
    };
  }, [url, onReady, canvas]);
  async function goTo(pageNumber: number) {
    if (running.current || !document.current || !canvas.current) return;
    running.current = true;
    setBusy(true);
    setPendingPage(pageNumber);
    setError(null);
    try {
      rendering.current = await createPdfRender({
        document: document.current,
        pageNumber,
        canvas: canvas.current,
      });
      await rendering.current.promise;
      if (mounted.current) setPage(pageNumber);
    } catch {
      if (mounted.current) setError(PREVIEW_ERROR);
    } finally {
      running.current = false;
      if (mounted.current) {
        setBusy(false);
        setPendingPage(null);
      }
    }
  }
  return { busy, error, page, pages, pendingPage, goTo };
}
