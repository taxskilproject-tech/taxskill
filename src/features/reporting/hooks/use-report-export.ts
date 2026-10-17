"use client";
import { useLayoutEffect, useRef, useState } from "react";

import type {
  ExportFormat,
  ReportFilters,
  ReportResult,
} from "@/domain/reporting/types/reporting.types";
import { useWorkspace } from "@/features/auth/providers/workspace-context";
import { generateReport } from "@/features/reporting/services/report-export";
import type {
  ExportFeedback,
  ExportRun,
} from "@/features/reporting/types/export.types";
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
  const [feedback, setFeedback] = useState<ExportFeedback | null>(null);
  // Discard completed feedback too, including when returning to a cached identity.
  if (feedback && feedback.identity !== identity) setFeedback(null);
  useLayoutEffect(() => {
    activeIdentity.current = identity;
    return () => {
      if (!run.current) return;
      run.current.discarded = true;
      run.current.controller.abort();
    };
  }, [identity]);
  async function start(selected: ExportFormat) {
    if (run.current) return;
    const current = {
      controller: new AbortController(),
      discarded: false,
      identity,
    };
    run.current = current;
    setFormat(selected);
    setCancelling(false);
    setFeedback({ identity, progress: "Preparando exportación…", error: "" });
    try {
      const file = await generateReport({
        organizationId: context.organization.id,
        format: selected,
        filters,
        result,
        signal: current.controller.signal,
        onProgress: (message) => {
          if (current.discarded || activeIdentity.current !== current.identity)
            return;
          setFeedback({ identity, progress: message, error: "" });
        },
      });
      current.controller.signal.throwIfAborted();
      if (current.discarded || activeIdentity.current !== current.identity)
        return;
      const url = URL.createObjectURL(file.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFeedback({
        identity,
        progress: `Archivo preparado: ${file.rows.length} obligaciones. Descarga solicitada al navegador.`,
        error: "",
      });
    } catch (failure) {
      if (current.discarded || activeIdentity.current !== current.identity)
        return;
      setFeedback({
        identity,
        error: exportFailureMessage(failure, current.controller.signal.aborted),
        progress: "",
      });
    } finally {
      run.current = null;
      setFormat(null);
      setCancelling(false);
    }
  }
  return {
    format,
    cancelling:
      cancelling || Boolean(format && feedback?.identity !== identity),
    progress: feedback?.identity === identity ? feedback.progress : "",
    error: feedback?.identity === identity ? feedback.error : "",
    start,
    cancel: () => {
      if (!run.current || run.current.controller.signal.aborted) return;
      setCancelling(true);
      if (run.current.identity === identity && !run.current.discarded) {
        setFeedback({
          identity,
          progress: "Cancelando exportación y conciliando registro…",
          error: "",
        });
      }
      run.current.controller.abort();
    },
  };
}
