"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/atoms/button";
import { FeedbackMessage } from "@/components/molecules/feedback-message";
import { FormField } from "@/components/molecules/form-field";
import { FormActions } from "@/features/access/components/form-actions";
import { useAction } from "@/features/access/hooks/use-action";
import type { SubmitEvent } from "@/features/access/types/access-ui.types";
import { parseForm, readForm } from "@/features/access/utils/form-data";
import { loginSchema } from "@/features/auth/contracts/session.schema";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { safeReturnTo } from "@/features/auth/utils/safe-return-to";

export function LoginPage() {
  const auth = useAuth();
  const action = useAction<null>();
  const [validation, setValidation] = useState<string | null>(null);
  const router = useRouter();
  useEffect(() => {
    if (auth.status === "ready")
      router.replace(
        safeReturnTo(
          new URLSearchParams(window.location.search).get("returnTo"),
        ),
      );
  }, [auth.status, router]);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = parseForm(loginSchema, readForm(form));
    setValidation(parsed.error);
    if (!parsed.data) return;
    if (
      await action.run(() =>
        auth.login(parsed.data!.email, parsed.data!.password),
      )
    )
      form.reset();
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-slate-950 p-12 text-white lg:flex">
        <p className="text-2xl font-semibold tracking-tight">TaxSkills.</p>
        <div className="max-w-lg space-y-6">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-300">
            El estudio, conectado
          </p>
          <h2 className="text-4xl leading-tight font-medium tracking-tight">
            Cada empresa.
            <br />
            Un mismo orden.
          </h2>
          <p className="max-w-md text-base leading-7 text-slate-300">
            Un espacio compartido para organizar el trabajo contable y la
            documentación de tus clientes.
          </p>
        </div>
        <p className="text-xs text-zinc-500">
          Gestión documental contable · Perú
        </p>
      </section>
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-3">
            <p className="text-sm font-semibold lg:hidden">TaxSkills.</p>
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              Acceso al estudio
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Bienvenido de nuevo
            </h1>
            <p className="text-sm leading-6 text-zinc-600">
              Ingresa con la cuenta que te proporcionó tu administrador.
            </p>
          </div>
          {auth.status === "blocked" ? (
            <div className="space-y-4">
              <FeedbackMessage kind="error">
                {auth.error?.message ??
                  "Tu cuenta requiere revisión administrativa."}
              </FeedbackMessage>
              <Button
                loading={action.busy}
                loadingText="Cerrando sesión…"
                onClick={() => {
                  void action.run(auth.logout);
                }}
              >
                Usar otra cuenta
              </Button>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={submit}>
              <FormField
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                id="email"
                label="Correo electrónico"
                name="email"
                required
                type="email"
              />
              <FormField
                autoComplete="current-password"
                id="password"
                label="Contraseña"
                name="password"
                required
                type="password"
              />
              <FormActions
                busy={action.busy || auth.status === "loading"}
                error={validation ?? action.error}
                label="Ingresar al estudio"
                loadingText={
                  auth.status === "loading"
                    ? "Verificando sesión…"
                    : "Ingresando…"
                }
              />
            </form>
          )}
          <p className="border-t border-zinc-200 pt-5 text-xs leading-6 text-zinc-500">
            Para recuperar el acceso o cambiar tu contraseña, contacta al
            administrador de tu estudio.
          </p>
        </div>
      </section>
    </main>
  );
}
