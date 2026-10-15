"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { normalizeOperationError } from "@/domain/common/utils/normalize-operation-error";
import { failure, success } from "@/domain/common/utils/operation-result";
import { loadSessionContext } from "@/features/auth/repositories/auth.repository";
import type {
  AuthController,
  AuthState,
} from "@/features/auth/types/auth.types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const INITIAL_STATE: AuthState = {
  status: "loading",
  context: null,
  error: null,
};

export function useSessionController(): AuthController {
  const [connection] = useState(createSupabaseBrowserClient);
  const [state, setState] = useState(INITIAL_STATE);
  const generation = useRef(0);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (!connection.ok) return;
    const attempt = ++generation.current;
    try {
      const result = await loadSessionContext(connection.data);
      if (!mounted.current || attempt !== generation.current) return;
      setState(
        result.ok
          ? { status: "ready", context: result.data, error: null }
          : { status: "blocked", context: null, error: result.error },
      );
    } catch (error) {
      if (mounted.current && attempt === generation.current)
        setState({
          status: "blocked",
          context: null,
          error: normalizeOperationError(error),
        });
    }
  }, [connection]);

  useEffect(() => {
    mounted.current = true;
    if (!connection.ok) return;
    function handleChange(hasSession: boolean) {
      if (!mounted.current) return;
      if (hasSession) {
        void refresh();
        return;
      }
      generation.current += 1;
      setState({ status: "anonymous", context: null, error: null });
    }
    const { data } = connection.data.auth.onAuthStateChange(
      (event, session) => {
        // Auth holds its internal lock in this callback; query after it has returned.
        queueMicrotask(
          handleChange.bind(null, Boolean(session && event !== "SIGNED_OUT")),
        );
      },
    );
    return () => {
      mounted.current = false;
      generation.current += 1;
      data.subscription.unsubscribe();
    };
  }, [connection, refresh]);

  useEffect(() => {
    if (state.status !== "ready") return;
    function revalidate() {
      void refresh();
    }
    window.addEventListener("focus", revalidate);
    return () => window.removeEventListener("focus", revalidate);
  }, [state.status, refresh]);

  async function login(email: string, password: string) {
    if (!connection.ok) return connection;
    const { error } = await connection.data.auth.signInWithPassword({
      email,
      password,
    });
    if (error)
      return failure({
        code: "UNAUTHENTICATED",
        message:
          "No se pudo ingresar. Verifica tus credenciales o consulta al administrador.",
      });
    return success(null);
  }

  async function logout() {
    if (!connection.ok) return connection;
    generation.current += 1;
    const channelResults = await connection.data.removeAllChannels();
    const { error } = await connection.data.auth.signOut({ scope: "local" });
    if (error) return failure(normalizeOperationError(error));
    setState({ status: "anonymous", context: null, error: null });
    if (channelResults.some((result) => result !== "ok"))
      return failure(normalizeOperationError(null));
    return success(null);
  }

  return {
    ...(connection.ok
      ? state
      : { status: "blocked", context: null, error: connection.error }),
    login,
    logout,
    refresh,
  };
}
