"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { DocumentPeriodNavigationKey } from "@/features/document-workspace/types/document-workspace-ui.types";
import {
  documentPeriodSelection,
  documentPeriodSelectionUrl,
} from "@/features/document-workspace/utils/document-period-navigation";
import { limaDocumentYear } from "@/features/document-workspace/utils/document-period-presentation";

export function useDocumentPeriodNavigation() {
  const parameters = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const year = limaDocumentYear(new Date());
  const selection = documentPeriodSelection(
    new URLSearchParams(parameters.toString()),
    year,
  );
  function select(key: DocumentPeriodNavigationKey, value: string) {
    router.replace(
      documentPeriodSelectionUrl(
        pathname,
        new URLSearchParams(parameters.toString()),
        key,
        value,
      ),
      { scroll: false },
    );
  }
  return { ...selection, select };
}
