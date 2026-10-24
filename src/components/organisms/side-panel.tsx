"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/atoms/button";
import type { SidePanelProps } from "@/components/types/layout.types";

export function SidePanel({
  title,
  children,
  onClose,
  wide = false,
}: SidePanelProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const dirty = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    const alreadyLocked = document.body.classList.contains("overflow-hidden");
    element?.showModal();
    document.body.classList.add("overflow-hidden");
    return () => {
      element?.close();
      if (!alreadyLocked) document.body.classList.remove("overflow-hidden");
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);
  function requestClose() {
    if (dialog.current?.querySelector('[aria-busy="true"]')) return;
    if (dirty.current) setConfirming(true);
    else onClose();
  }
  return (
    <dialog
      aria-labelledby={titleId}
      className={`fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-none bg-zinc-50 p-0 text-zinc-950 shadow-xl backdrop:bg-zinc-950/30 ${wide ? "sm:max-w-3xl" : "sm:max-w-xl"}`}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      ref={dialog}
    >
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3">
          <h2 className="text-lg font-semibold" id={titleId}>
            {title}
          </h2>
          <Button onClick={requestClose} variant="secondary">
            Cerrar
          </Button>
        </header>
        {confirming ? (
          <section aria-label="Descartar cambios" className="space-y-4 p-5">
            <h3 className="font-semibold">Hay cambios sin guardar</h3>
            <p className="text-sm text-zinc-600">
              Puedes continuar editando o cerrar y descartar estos cambios.
            </p>
            <Button onClick={() => setConfirming(false)}>
              Seguir editando
            </Button>
            <Button onClick={onClose} variant="secondary">
              Descartar y cerrar
            </Button>
          </section>
        ) : null}
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5"
          hidden={confirming}
          onChangeCapture={(event) => {
            if (event.target instanceof Element && event.target.closest("form"))
              dirty.current = true;
          }}
          onClickCapture={(event) => {
            if (!(event.target instanceof Element)) return;
            if (
              event.target.closest("button")?.textContent?.trim() !==
                "Cancelar" ||
              !dirty.current
            )
              return;
            event.preventDefault();
            event.stopPropagation();
            requestClose();
          }}
        >
          {children}
        </div>
      </div>
    </dialog>
  );
}
