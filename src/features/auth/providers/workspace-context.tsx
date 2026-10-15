"use client";

import { createContext, useContext } from "react";

import type { WorkspaceContextValue } from "@/features/auth/types/auth.types";

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(
  null,
);

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context)
    throw new Error("Se requiere un contexto de trabajo autenticado.");
  return context;
}
