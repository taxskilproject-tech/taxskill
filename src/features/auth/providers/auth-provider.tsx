"use client";

import { createContext, useContext } from "react";

import { useSessionController } from "@/features/auth/hooks/use-session-controller";
import type {
  AuthController,
  AuthProviderProps,
} from "@/features/auth/types/auth.types";

const AuthContext = createContext<AuthController | null>(null);

export function AuthProvider({ children }: AuthProviderProps) {
  const controller = useSessionController();
  return <AuthContext value={controller}>{children}</AuthContext>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider es obligatorio.");
  return context;
}
