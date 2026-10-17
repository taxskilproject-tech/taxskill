"use client";
import { useScopedCommand } from "@/features/access/hooks/use-scoped-command";
import { documentCommand } from "@/features/documents/repositories/document.repository";

export function useDocumentCommand() {
  return useScopedCommand(documentCommand);
}
