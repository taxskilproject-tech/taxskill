import type { PDFDocumentProxy } from "pdfjs-dist";
import type { RefObject } from "react";

export type PdfCanvasRef = RefObject<HTMLCanvasElement | null>;
export interface PreviewFile {
  url: string;
  extension: string;
  name: string;
}
export interface FilePreviewProps {
  file: PreviewFile;
  onReady: PreviewReady;
}
export interface FilePreviewPanelProps extends FilePreviewProps {
  inline?: boolean;
  onClose: () => void;
}
export interface PdfPreviewProps {
  url: string;
  name: string;
  onReady: PreviewReady;
}
export type PreviewReady = () => void;
export interface PdfPageRender {
  document: PDFDocumentProxy;
  pageNumber: number;
  canvas: HTMLCanvasElement;
}
