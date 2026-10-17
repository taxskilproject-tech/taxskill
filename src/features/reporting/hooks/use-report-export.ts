"use client";
import { useLayoutEffect, useRef, useState } from "react";

import type {
  ExportFormat,
  ReportFilters,
  ReportResult,
} from "@/domain/reporting/types/reporting.types";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { generateReport } from "@/features/reporting/services/report-export";
import type { ExportRun } from "@/features/reporting/types/export.types";
import { exportFailureMessage } from "@/features/reporting/utils/export-failure-message";

export function useReportExport(filters: ReportFilters, result: ReportResult) {
  const { context, company } = useWorkspace();
  const identity = JSON.stringify([
    context.profile.user_id,
    context.organization.id,
    context.capabilities,
    company,
    filters,
  ]);
  const activeIdentity = useRef(identity);
  const run = useRef<ExportRun | null>(null);
  const [format, setFormat] = useState<ExportFormat | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  useLayoutEffect(() => {
    activeIdentity.current = identity;
    return () => {
      run.current?.controller.abort();
    };
  }, [identity]);
  async function start(selected: ExportFormat) {
    if (run.current) return;
    const current = { controller: new AbortController(), identity };
    run.current = current;
    setFormat(selected);
    setCancelling(false);
    setError("");
    try {
      const file = await generateReport({
        organizationId: context.organization.id,
        format: selected,
        filters,
        result,
        signal: current.controller.signal,
        onProgress: (message) => {
          if (activeIdentity.current === current.identity) setProgress(message);
        },
      });
      current.controller.signal.throwIfAborted();
      if (activeIdentity.current !== current.identity) return;
      const url = URL.createObjectURL(file.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setProgress(
        `Archivo preparado: ${file.rows.length} obligaciones. Descarga solicitada al navegador.`,
      );
    } catch (failure) {
      if (activeIdentity.current !== current.identity) return;
      setError(
        exportFailureMessage(failure, current.controller.signal.aborted),
      );
      setProgress("");
    } finally {
      run.current = null;
      setFormat(null);
      setCancelling(false);
    }
  }
  return {
    format,
    cancelling,
    progress,
    error,
    start,
    cancel: () => {
      if (!run.current || run.current.controller.signal.aborted) return;
      setCancelling(true);
      setProgress("Cancelando exportación y conciliando registro…");
      run.current.controller.abort();
    },
  };
}
